import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import Joi from 'joi';

import { validate } from '../validate.middleware.js';
import { serviceListQuerySchema } from '../../validators/service.validator.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

const startServer = (app) => new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
});

const stopServer = (server) => new Promise((resolve, reject) => {
    server.close((error) => {
        if (error) {
            reject(error);
            return;
        }

        resolve();
    });
});

test('query validation stores sanitized data without mutating req.query', async () => {
    const app = express();

    app.get('/services', validate(serviceListQuerySchema, 'query'), (req, res) => {
        res.status(200).json({
            validated: getValidatedRequestData(req, 'query'),
            alias: req.validatedQuery,
            raw: req.query,
        });
    });

    const server = await startServer(app);

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/services?page=2&limit=5&serviceType=single&extra=discard-me`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body.validated, {
            page: 2,
            limit: 5,
            serviceType: 'single',
        });
        assert.deepEqual(body.alias, body.validated);
        assert.deepEqual(body.raw, {
            page: '2',
            limit: '5',
            serviceType: 'single',
            extra: 'discard-me',
        });
    } finally {
        await stopServer(server);
    }
});

test('body validation still replaces req.body with the sanitized payload', async () => {
    const app = express();
    const bodySchema = Joi.object({
        serviceName: Joi.string().trim().required(),
    });

    app.use(express.json());
    app.post('/services', validate(bodySchema, 'body'), (req, res) => {
        res.status(200).json({
            body: req.body,
            validated: req.validated.body,
            alias: req.validatedBody,
        });
    });

    const server = await startServer(app);

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serviceName: '  Haircut  ',
                ignored: true,
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body.body, { serviceName: 'Haircut' });
        assert.deepEqual(body.validated, body.body);
        assert.deepEqual(body.alias, body.body);
    } finally {
        await stopServer(server);
    }
});
