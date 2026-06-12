import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import User from '../models/user.model.js';

// Helper to run the script with specific process.argv
async function runScript({ phone, email }) {
  const originalArgv = process.argv;
  process.argv = [
    process.execPath,
    'create-admin-user.mjs',
    `--phone=${phone}`,
    `--email=${email}`
  ];

  try {
    // Dynamic import with cache busting query parameter to force re-execution of the module
    await import(`../../scripts/create-admin-user.mjs?cb=${Math.random()}`);
  } finally {
    process.argv = originalArgv;
  }
}

test('create-admin-user script checks', async (t) => {
  // Stub mongoose connect/disconnect
  t.mock.method(mongoose, 'connect', async () => {});
  t.mock.method(mongoose, 'disconnect', async () => {});

  // Stub User.create
  let createdUserPayload = null;
  t.mock.method(User, 'create', async (payload) => {
    createdUserPayload = payload;
    return { _id: 'new-admin-id-123' };
  });

  // Capture structured log output
  const infos = [];
  const warns = [];
  const errors = [];
  t.mock.method(console, 'info', (...args) => { infos.push(args.join(' ')); });
  t.mock.method(console, 'warn', (...args) => { warns.push(args.join(' ')); });
  t.mock.method(console, 'error', (...args) => { errors.push(args.join(' ')); });
  // Suppress plain console.log (readline prompts, etc.)
  t.mock.method(console, 'log', () => {});

  t.afterEach(() => {
    infos.length = 0;
    warns.length = 0;
    errors.length = 0;
    createdUserPayload = null;
    // Reset exit code — validation failure tests set it to 1
    process.exitCode = undefined;
  });

  // ─── Create path ──────────────────────────────────────────────────────

  await t.test('creates admin successfully if user does not exist', async () => {
    // Stub User.findOne to return null (user not found)
    const findOneMock = t.mock.method(User, 'findOne', () => {
      return {
        setOptions: () => ({ lean: () => null }),
      };
    });

    await runScript({ phone: '+919876543210', email: 'newadmin@evercut.in' });

    assert.ok(createdUserPayload, 'User.create should have been called');
    assert.equal(createdUserPayload.phoneNumber, '+919876543210');
    assert.equal(createdUserPayload.email, 'newadmin@evercut.in');
    assert.equal(createdUserPayload.roleType, 'ADMIN');
    assert.equal(createdUserPayload.isActive, true);
    assert.ok(infos.some(log => log.includes('Admin user created successfully')));

    findOneMock.mock.restore();
  });

  // ─── Skip path (user exists) ─────────────────────────────────────────

  await t.test('does not create admin user if user with the same email or phone already exists', async () => {
    const mockExistingUser = {
      _id: 'existing-id-456',
      phoneNumber: '+919876543210',
      email: 'existingcustomer@evercut.in',
      roleType: 'CUSTOMER',
      isActive: true,
      deletedAt: null,
    };

    // Stub User.findOne to return the existing customer
    const findOneMock = t.mock.method(User, 'findOne', () => {
      return {
        setOptions: () => ({ lean: () => mockExistingUser }),
      };
    });

    await runScript({ phone: '+919876543210', email: 'existingcustomer@evercut.in' });

    // Ensure User.create was NOT called
    assert.equal(createdUserPayload, null, 'User.create must NOT be called for existing users');

    // Ensure we exited safely with an informational log
    assert.ok(infos.some(log => log.includes('User already exists') && log.includes('No changes made')));

    findOneMock.mock.restore();
  });

  // ─── Race condition path (duplicate key) ──────────────────────────────

  await t.test('handles duplicate-key error from race condition gracefully', async () => {
    // Pre-flight check returns null (simulating a TOCTOU race: user didn't exist
    // at read time, but another process inserted between read and write)
    const findOneMock = t.mock.method(User, 'findOne', () => {
      return {
        setOptions: () => ({ lean: () => null }),
      };
    });

    // Override User.create to throw a MongoDB duplicate-key error
    const createMock = t.mock.method(User, 'create', async () => {
      const err = new Error('E11000 duplicate key error collection: test.users');
      err.code = 11000;
      err.name = 'MongoServerError';
      throw err;
    });

    await runScript({ phone: '+919876543210', email: 'raceadmin@evercut.in' });

    // Should NOT set a failure exit code — this is an idempotent success
    assert.notEqual(process.exitCode, 1, 'Duplicate key should not cause a failure exit code');

    // Should log a warning, not an error
    assert.ok(warns.some(log => log.includes('Duplicate key during insert')));
    assert.ok(errors.every(log => !log.includes('Admin bootstrap failed')));

    findOneMock.mock.restore();
    createMock.mock.restore();
  });

  // ─── Validation paths ────────────────────────────────────────────────

  await t.test('rejects invalid phone number', async () => {
    await runScript({ phone: '12345', email: 'valid@evercut.in' });

    assert.equal(createdUserPayload, null, 'User.create must NOT be called with invalid phone');
    assert.ok(errors.some(log => log.includes('Admin bootstrap failed') && log.includes('international format')));
  });

  await t.test('rejects invalid email', async () => {
    await runScript({ phone: '+919876543210', email: 'not-an-email' });

    assert.equal(createdUserPayload, null, 'User.create must NOT be called with invalid email');
    assert.ok(errors.some(log => log.includes('Admin bootstrap failed') && log.includes('valid email')));
  });

  // ─── Existing user immutability verification ──────────────────────────

  await t.test('never modifies existing users — no update/delete calls exist', async () => {
    // This test statically verifies that no mutation methods are called on existing users.
    // We mock findOneAndUpdate, updateOne, updateMany, deleteOne, deleteMany and verify
    // they are never invoked during the "user exists" path.

    const mutations = [];
    const trackMutation = (name) => (...args) => { mutations.push({ method: name, args }); return Promise.resolve(); };

    const updateOneMock = t.mock.method(User, 'updateOne', trackMutation('updateOne'));
    const updateManyMock = t.mock.method(User, 'updateMany', trackMutation('updateMany'));
    const deleteOneMock = t.mock.method(User, 'deleteOne', trackMutation('deleteOne'));
    const deleteManyMock = t.mock.method(User, 'deleteMany', trackMutation('deleteMany'));
    const findOneAndUpdateMock = t.mock.method(User, 'findOneAndUpdate', trackMutation('findOneAndUpdate'));
    const findOneAndDeleteMock = t.mock.method(User, 'findOneAndDelete', trackMutation('findOneAndDelete'));

    const findOneMock = t.mock.method(User, 'findOne', () => ({
      setOptions: () => ({
        lean: () => ({
          _id: 'existing-id-789',
          phoneNumber: '+919876543210',
          email: 'existing@evercut.in',
          roleType: 'CUSTOMER',
          isActive: true,
          deletedAt: null,
        }),
      }),
    }));

    await runScript({ phone: '+919876543210', email: 'existing@evercut.in' });

    assert.equal(mutations.length, 0, `Expected zero mutation calls, but got: ${mutations.map(m => m.method).join(', ')}`);
    assert.equal(createdUserPayload, null, 'User.create must NOT be called for existing users');

    findOneMock.mock.restore();
    updateOneMock.mock.restore();
    updateManyMock.mock.restore();
    deleteOneMock.mock.restore();
    deleteManyMock.mock.restore();
    findOneAndUpdateMock.mock.restore();
    findOneAndDeleteMock.mock.restore();
  });
});
