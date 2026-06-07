#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EverCut — Admin User Creation/Promotion Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Creates a new administrator user or promotes an existing user to the ADMIN role.
 *
 * ── Architecture ────────────────────────────────────────────────────────────
 * This script connects to the MongoDB database using the MONGODB_URI environment
 * variable, normalizes the input phone number, validates the inputs, and checks
 * if a user exists with the given credentials. It then either creates a new
 * ADMIN user or updates the role of an existing user to ADMIN, activating the account.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 * # Interactive mode (prompts for inputs if arguments are missing):
 * node scripts/create-admin-user.mjs
 *
 * # Non-interactive mode (passing arguments directly):
 * node scripts/create-admin-user.mjs --phone=+919876543212 --email=admin@evercut.in
 *
 * ── Prerequisites ───────────────────────────────────────────────────────────
 * 1. .env must contain: MONGODB_URI
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return null;
};

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required in server/.env');
  }

  const phoneInput = getArgValue('phone') || await rl.question('Admin phone number (for example +919876543212): ');
  const emailInput = getArgValue('email') || await rl.question('Admin email: ');
  const phoneNumber = normalizePhoneNumber(phoneInput);
  const email = String(emailInput || '').trim().toLowerCase();

  assertValidInput({ phoneNumber, email });

  await mongoose.connect(uri);
  const { default: User } = await import('../src/models/user.model.js');

  const emailOwner = await User.findOne({ email }).setOptions({ includeDeleted: true });
  if (emailOwner && emailOwner.phoneNumber !== phoneNumber) {
    throw new Error(`Email ${email} already belongs to another user (${emailOwner._id})`);
  }

  const existing = await User.findOne({ phoneNumber }).setOptions({ includeDeleted: true });
  if (existing) {
    existing.email = email;
    existing.roleType = 'ADMIN';
    existing.isActive = true;
    existing.deletedAt = null;
    await existing.save();
    console.log(`Updated existing user ${existing._id} to ADMIN`);
  } else {
    const admin = await User.create({
      phoneNumber,
      email,
      roleType: 'ADMIN',
      isActive: true,
    });
    console.log(`Created admin user ${admin._id}`);
  }
} finally {
  rl.close();
  await mongoose.disconnect().catch(() => {});
}
