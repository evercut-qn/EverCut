import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import Joi from 'joi';

import { validate } from '../validate.middleware.js';
import {
    bookingsByStatusQuerySchema,
    customerBookingsQuerySchema,
} from '../../validators/booking.validator.js';
import { addEmployeeSchema } from '../../validators/employee.validator.js';
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

test('body validation stores sanitized data without mutating req.body', async () => {
    const app = express();
    const bodySchema = Joi.object({
        serviceName: Joi.string().trim().required(),
    });

    app.use(express.json());
    app.post('/services', validate(bodySchema, 'body'), (req, res) => {
        res.status(200).json({
            raw: req.body,
            validated: getValidatedRequestData(req, 'body'),
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
        assert.deepEqual(body.raw, {
            serviceName: '  Haircut  ',
            ignored: true,
        });
        assert.deepEqual(body.validated, { serviceName: 'Haircut' });
    } finally {
        await stopServer(server);
    }
});

test('params validation stores sanitized data without mutating req.params', async () => {
    const app = express();
    const paramsSchema = Joi.object({
        id: Joi.string().lowercase().required(),
    });

    app.get('/services/:id', validate(paramsSchema, 'params'), (req, res) => {
        res.status(200).json({
            raw: req.params,
            validated: getValidatedRequestData(req, 'params'),
        });
    });

    const server = await startServer(app);

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/services/ABC123`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body.raw, { id: 'ABC123' });
        assert.deepEqual(body.validated, { id: 'abc123' });
    } finally {
        await stopServer(server);
    }
});

test('booking query schemas preserve pagination fields', () => {
    const customerBookings = customerBookingsQuerySchema.validate({
        type: 'past',
        page: '2',
        limit: '5',
    });
    const bookingsByStatus = bookingsByStatusQuerySchema.validate({
        status: 'confirmed',
        page: '3',
        limit: '10',
    });

    assert.equal(customerBookings.error, undefined);
    assert.deepEqual(customerBookings.value, {
        type: 'past',
        page: 2,
        limit: 5,
    });

    assert.equal(bookingsByStatus.error, undefined);
    assert.deepEqual(bookingsByStatus.value, {
        status: 'confirmed',
        page: 3,
        limit: 10,
    });
});

test('employee creation schema accepts multipart string fields', () => {
    const employee = addEmployeeSchema.validate({
        firstName: 'Alex',
        lastName: 'Stylist',
        phoneNumber: '9876543210',
        gender: 'Male',
        dateOfBirth: '1994-04-12',
        workingHours: '{"start":"09:00","end":"18:00"}',
        blockedDates: '[]',
    });

    assert.equal(employee.error, undefined);
    assert.deepEqual(employee.value, {
        firstName: 'Alex',
        lastName: 'Stylist',
        phoneNumber: '9876543210',
        gender: 'Male',
        dateOfBirth: new Date('1994-04-12T00:00:00.000Z'),
        workingHours: '{"start":"09:00","end":"18:00"}',
        blockedDates: '[]',
    });
});
