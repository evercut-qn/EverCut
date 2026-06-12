#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EverCut — Admin User Bootstrap Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Creates a new administrator user if — and only if — no user with the same
 * email or phone number already exists.
 *
 * ── Safety guarantees ───────────────────────────────────────────────────────
 *   • This script NEVER modifies, promotes, demotes, or deletes existing users.
 *   • If a matching user exists (active OR soft-deleted), the script exits
 *     successfully with an informational message and exit code 0.
 *   • Multiple concurrent executions are safe: MongoDB unique indexes on
 *     `email` and `phoneNumber` are the authoritative guard against duplicates.
 *   • The script is fully idempotent — running it N times produces the same
 *     result as running it once.
 *
 * ── Strategy ────────────────────────────────────────────────────────────────
 *   1. Pre-flight read-only check (findOne) — provides a clear informational
 *      message if the user already exists.
 *   2. Attempt insert (User.create) — the actual creation.
 *   3. Catch duplicate-key error (E11000) — if a concurrent insert won the
 *      race, treat it as an idempotent success.
 *
 *   The pre-flight check is purely for UX. The database unique indexes are the
 *   single source of truth for preventing duplicates.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   # Non-interactive (CI, Docker, scripts):
 *   node scripts/create-admin-user.mjs --phone=+919876543212 --email=admin@evercut.in
 *
 *   # Interactive (prompts for missing inputs):
 *   node scripts/create-admin-user.mjs
 *
 * ── Exit codes ──────────────────────────────────────────────────────────────
 *   0 — Admin created successfully, or already exists (idempotent success).
 *   1 — Unrecoverable error (validation, connection failure, unexpected).
 *
 * ── Prerequisites ───────────────────────────────────────────────────────────
 *   1. .env must contain: MONGODB_URI
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

// ---------------------------------------------------------------------------
// Structured logging (minimal, self-contained)
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[admin-bootstrap]';

/**
 * Mask a phone number to show only the last 4 digits.
 * Example: +919876543212 → +91******3212
 */
const maskPhone = (value) => {
    if (!value) return String(value ?? '');
    const raw = String(value).trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 4) return raw;

    let visibleDigits = 0;
    return [...raw]
        .reverse()
        .map((char) => {
            if (!/\d/.test(char)) return char;
            visibleDigits += 1;
            return visibleDigits <= 4 ? char : '*';
        })
        .reverse()
        .join('');
};

/**
 * Mask an email address for log output.
 * Example: admin@evercut.in → ad***@evercut.in
 */
const maskEmail = (value) => {
    if (!value) return String(value ?? '');
    const raw = String(value).trim();
    const atIndex = raw.indexOf('@');
    if (atIndex <= 0) return raw;

    const local = raw.slice(0, atIndex);
    const domain = raw.slice(atIndex);
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***${domain}`;
};

const formatMeta = (meta) => {
    const entries = Object.entries(meta);
    if (entries.length === 0) return '';
    return '\n' + entries.map(([k, v]) => `  ${k}: ${v}`).join('\n');
};

const log = {
    info: (message, meta = {}) => {
        const timestamp = new Date().toISOString();
        console.info(`[${timestamp}] INFO: ${LOG_PREFIX} ${message}${formatMeta(meta)}`);
    },
    warn: (message, meta = {}) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] WARN: ${LOG_PREFIX} ${message}${formatMeta(meta)}`);
    },
    error: (message, meta = {}) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR: ${LOG_PREFIX} ${message}${formatMeta(meta)}`);
    },
};

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const getArgValue = (name) => {
    const prefix = `--${name}=`;
    const inline = process.argv.find((arg) => arg.startsWith(prefix));
    if (inline) return inline.slice(prefix.length);

    const index = process.argv.indexOf(`--${name}`);
    if (index >= 0) return process.argv[index + 1];
    return null;
};

// ---------------------------------------------------------------------------
// Input normalization & validation
// ---------------------------------------------------------------------------

const normalizePhoneNumber = (phoneNumber) => {
    const value = String(phoneNumber || '').trim();
    const digits = value.replace(/\D/g, '');

    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (value.startsWith('+')) return value;
    return value;
};

const assertValidInput = ({ phoneNumber, email }) => {
    if (!/^\+\d{10,15}$/.test(phoneNumber)) {
        throw new Error('Phone number must be in international format, for example +919876543212');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Email must be a valid email address');
    }
};

// ---------------------------------------------------------------------------
// Duplicate-key detection
// ---------------------------------------------------------------------------

/**
 * Determine whether an error is a MongoDB duplicate-key error (E11000).
 * Works for both the native driver error and Mongoose's wrapper.
 *
 * @param {Error} err
 * @returns {boolean}
 */
const isDuplicateKeyError = (err) => {
    // Mongoose wraps the native driver error; code lives at err.code or
    // inside err.cause. The duplicate key error code is always 11000.
    if (err.code === 11000) return true;
    if (err.cause && err.cause.code === 11000) return true;
    // Mongoose MongoServerError name
    if (err.name === 'MongoServerError' && err.code === 11000) return true;
    return false;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** @type {import('node:readline/promises').Interface | null} */
let rl = null;

try {
    // 1. Validate environment
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is required in server/.env');
    }

    // 2. Collect inputs — only open readline if interactive input is needed
    const phoneArg = getArgValue('phone');
    const emailArg = getArgValue('email');

    let phoneInput = phoneArg;
    let emailInput = emailArg;

    if (!phoneArg || !emailArg) {
        rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        if (!phoneArg) phoneInput = await rl.question('Admin phone number (for example +919876543212): ');
        if (!emailArg) emailInput = await rl.question('Admin email: ');
    }

    const phoneNumber = normalizePhoneNumber(phoneInput);
    const email = String(emailInput || '').trim().toLowerCase();

    // 3. Validate inputs
    assertValidInput({ phoneNumber, email });

    // 4. Connect to database
    await mongoose.connect(uri);
    const { default: User } = await import('../src/models/user.model.js');

    // 5. Pre-flight read-only check (informational only — NOT the safety guard)
    //    Uses .lean() so the result is a plain JS object with no Mongoose methods.
    //    Includes soft-deleted users to prevent re-creation of deleted accounts.
    const existingUser = await User.findOne({
        $or: [{ email }, { phoneNumber }],
    }).setOptions({ includeDeleted: true }).lean();

    if (existingUser) {
        log.info('User already exists. No changes made.', {
            userId: String(existingUser._id),
            email: maskEmail(existingUser.email),
            phone: maskPhone(existingUser.phoneNumber),
            roleType: existingUser.roleType,
            isActive: existingUser.isActive,
            isDeleted: existingUser.deletedAt !== null && existingUser.deletedAt !== undefined,
        });
    } else {
        // 6. Attempt insert — MongoDB unique indexes are the authoritative guard
        try {
            const admin = await User.create({
                phoneNumber,
                email,
                roleType: 'ADMIN',
                isActive: true,
            });

            log.info('Admin user created successfully.', {
                userId: String(admin._id),
                email: maskEmail(email),
                phone: maskPhone(phoneNumber),
            });
        } catch (insertError) {
            // 7. Handle race condition: another process inserted first
            if (isDuplicateKeyError(insertError)) {
                log.warn('Duplicate key during insert — a concurrent process likely created this user. No changes made.', {
                    email: maskEmail(email),
                    phone: maskPhone(phoneNumber),
                });
            } else {
                throw insertError;
            }
        }
    }
} catch (err) {
    log.error('Admin bootstrap failed.', { error: err.message });
    process.exitCode = 1;
} finally {
    rl?.close();
    await mongoose.disconnect().catch(() => {});
}
