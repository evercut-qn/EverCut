import assert from 'node:assert/strict';
import test from 'node:test';
import Joi from 'joi';

import { validate } from '../validate.middleware.js';
import {
    bookingsByStatusQuerySchema,
    customerBookingsQuerySchema,
} from '../../validators/booking.validator.js';
import { addEmployeeSchema } from '../../validators/employee.validator.js';
import { serviceListQuerySchema } from '../../validators/service.validator.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

const runValidation = (schema, source, rawValue) => new Promise((resolve, reject) => {
    const req = { [source]: rawValue };

    validate(schema, source)(req, {}, (error) => {
        if (error) {
            reject(error);
            return;
        }

        resolve(req);
    });
});

test('query validation stores sanitized data without mutating req.query', async () => {
    const rawQuery = {
        page: '2',
        limit: '5',
        serviceType: 'single',
        extra: 'discard-me',
    };

    const req = await runValidation(serviceListQuerySchema, 'query', rawQuery);

    assert.deepEqual(getValidatedRequestData(req, 'query'), {
        page: 2,
        limit: 5,
        serviceType: 'single',
    });
    assert.deepEqual(req.query, {
        page: '2',
        limit: '5',
        serviceType: 'single',
        extra: 'discard-me',
    });
});

test('body validation stores sanitized data without mutating req.body', async () => {
    const bodySchema = Joi.object({
        serviceName: Joi.string().trim().required(),
    });

    const rawBody = {
        serviceName: '  Haircut  ',
        ignored: true,
    };

    const req = await runValidation(bodySchema, 'body', rawBody);

    assert.deepEqual(req.body, {
        serviceName: '  Haircut  ',
        ignored: true,
    });
    assert.deepEqual(getValidatedRequestData(req, 'body'), { serviceName: 'Haircut' });
});

test('params validation stores sanitized data without mutating req.params', async () => {
    const paramsSchema = Joi.object({
        id: Joi.string().lowercase().required(),
    });

    const rawParams = { id: 'ABC123' };
    const req = await runValidation(paramsSchema, 'params', rawParams);

    assert.deepEqual(req.params, { id: 'ABC123' });
    assert.deepEqual(getValidatedRequestData(req, 'params'), { id: 'abc123' });
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
