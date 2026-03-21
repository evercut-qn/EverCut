import assert from 'node:assert/strict';
import test from 'node:test';

import cloudinary from '../../config/cloudinary.config.js';
import bookingRepository from '../../repositories/booking.repository.js';
import employeeRepository from '../../repositories/employee.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import * as employeeService from '../employee.service.js';

test('deleteEmployee blocks unresolved bookings for that employee', async (t) => {
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({ _id: 'shop-1' }));
    t.mock.method(employeeRepository, 'findById', async () => ({
        _id: 'employee-1',
        shopId: 'shop-1',
        cloudinaryId: 'employee-photo-1',
    }));
    t.mock.method(bookingRepository, 'hasActiveBookingsForEmployee', async () => true);

    let softDeleteCalled = false;
    t.mock.method(employeeRepository, 'softDelete', async () => {
        softDeleteCalled = true;
        return null;
    });

    await assert.rejects(
        () => employeeService.deleteEmployee('owner-1', 'employee-1'),
        {
            name: 'BadRequestError',
            message: 'Cannot delete employee with upcoming or pending bookings',
        },
    );

    assert.equal(softDeleteCalled, false);
});

test('addEmployee cleans up uploaded photo when a duplicate write slips past the pre-check', async (t) => {
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({
        _id: 'shop-1',
        openTime: '09:00',
        closeTime: '18:00',
    }));
    t.mock.method(employeeRepository, 'findByShopIdAndPhone', async () => null);
    t.mock.method(employeeRepository, 'create', async () => {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
    });

    let destroyedPublicId = null;
    t.mock.method(cloudinary.uploader, 'destroy', async (publicId) => {
        destroyedPublicId = publicId;
        return { result: 'ok' };
    });

    await assert.rejects(
        () => employeeService.addEmployee(
            'owner-1',
            {
                firstName: 'Alex',
                lastName: 'Stylist',
                phoneNumber: '+15551234567',
                gender: 'Male',
                dateOfBirth: '1994-04-12',
                workingHours: { start: '09:00', end: '18:00' },
            },
            {
                path: 'https://example.com/photo.jpg',
                public_id: 'employee-photo-1',
            },
        ),
        {
            name: 'ConflictError',
            message: 'Employee with this phone number already exists',
        },
    );

    assert.equal(destroyedPublicId, 'employee-photo-1');
});

test('addEmployee accepts 24-hour employee hours when legacy shop hours are stored in AM/PM format', async (t) => {
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({
        _id: 'shop-1',
        openTime: '09:00 AM',
        closeTime: '08:00 PM',
    }));
    t.mock.method(employeeRepository, 'findByShopIdAndPhone', async () => null);

    let createdPayload = null;
    t.mock.method(employeeRepository, 'create', async (payload) => {
        createdPayload = payload;
        return payload;
    });

    const employee = await employeeService.addEmployee(
        'owner-1',
        {
            firstName: 'Alex',
            lastName: 'Stylist',
            phoneNumber: '+15551234567',
            gender: 'Male',
            dateOfBirth: '1994-04-12',
            workingHours: { start: '09:00', end: '18:00' },
        },
        null,
    );

    assert.deepEqual(createdPayload.workingHours, { start: '09:00', end: '18:00' });
    assert.equal(employee.shopId, 'shop-1');
});

test('addEmployee defaults working hours to normalized 24-hour shop hours', async (t) => {
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({
        _id: 'shop-1',
        openTime: '09:00 AM',
        closeTime: '08:00 PM',
    }));
    t.mock.method(employeeRepository, 'findByShopIdAndPhone', async () => null);

    let createdPayload = null;
    t.mock.method(employeeRepository, 'create', async (payload) => {
        createdPayload = payload;
        return payload;
    });

    await employeeService.addEmployee(
        'owner-1',
        {
            firstName: 'Alex',
            lastName: 'Stylist',
            phoneNumber: '+15551234567',
            gender: 'Male',
            dateOfBirth: '1994-04-12',
        },
        null,
    );

    assert.deepEqual(createdPayload.workingHours, { start: '09:00', end: '20:00' });
});
