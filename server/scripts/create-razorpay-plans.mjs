#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EverCut — Razorpay Plan Provisioning Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Creates Razorpay billing plans that map to EverCut's subscription tiers.
 *
 * ── Architecture ────────────────────────────────────────────────────────────
 * This script reads plan definitions from `src/config/subscription-plan-definitions.js`
 * (shared by runtime config and plan provisioning) and provisions the corresponding
 * plans on Razorpay. It is IDEMPOTENT — running it multiple times will NOT create
 * duplicate plans. It detects existing plans by name and skips them.
 *
 * ── Plan Mapping ────────────────────────────────────────────────────────────
 * EverCut Plan      Razorpay Plan           Billing
 * ─────────────     ─────────────           ─────────
 * Basic (Free)      No Razorpay plan        N/A
 * Popular ₹299/mo   EverCut - Popular       Monthly
 * Advanced ₹499/mo  EverCut - Advanced      Monthly
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 * # Dry run (default) — shows what would be created, creates nothing
 * node scripts/create-razorpay-plans.mjs
 *
 * # Execute — actually creates plans on Razorpay
 * node scripts/create-razorpay-plans.mjs --execute
 *
 * # List existing plans on Razorpay (for verification)
 * node scripts/create-razorpay-plans.mjs --list
 *
 * ── Prerequisites ───────────────────────────────────────────────────────────
 * 1. .env must contain: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 * 2. npm install razorpay (if not already installed)
 *
 * ── After Running ───────────────────────────────────────────────────────────
 * Copy the output plan IDs into your .env file:
 *   RAZORPAY_PLAN_ID_POPULAR=plan_xxxxxxxxxxxxxxxx
 *   RAZORPAY_PLAN_ID_ADVANCED=plan_xxxxxxxxxxxxxxxx
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import { getRazorpayProvisioningPlans } from '../src/config/subscription-plan-definitions.js';

// ─── Load Environment ───────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Plan definitions are shared with runtime subscription config through
 * src/config/subscription-plan-definitions.js. Razorpay plans are immutable;
 * price changes require creating new gateway plans and updating env plan IDs.
 */
const EVERCUT_PLANS = getRazorpayProvisioningPlans();

// ─── Razorpay Client ────────────────────────────────────────────────────────

function createRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('');
    console.error('  ❌ Missing required environment variables:');
    if (!keyId) console.error('     • RAZORPAY_KEY_ID');
    if (!keySecret) console.error('     • RAZORPAY_KEY_SECRET');
    console.error('');
    console.error('  Add them to your server/.env file and try again.');
    console.error('');
    process.exit(1);
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ─── Environment Validation ─────────────────────────────────────────────────

function requireRazorpayEnvironment() {
  const env = process.env.RAZORPAY_ENV;
  if (!env) {
    throw new Error('Missing required environment variable: RAZORPAY_ENV');
  }
  if (['SANDBOX', 'PRODUCTION'].includes(env)) return env;
  throw new Error('RAZORPAY_ENV must be SANDBOX or PRODUCTION');
}

function assertRazorpayKeyMatchesEnvironment(env) {
  const keyId = process.env.RAZORPAY_KEY_ID || '';

  if (keyId.startsWith('rzp_test_') && env === 'PRODUCTION') {
    throw new Error('RAZORPAY_KEY_ID is a test key but RAZORPAY_ENV is PRODUCTION');
  }

  if (keyId.startsWith('rzp_live_') && env === 'SANDBOX') {
    throw new Error('RAZORPAY_KEY_ID is a live key but RAZORPAY_ENV is SANDBOX');
  }
}

function formatRazorpayEnvironment(env) {
  if (env === 'PRODUCTION') return '🔴 PRODUCTION';
  if (env === 'SANDBOX') return '🟢 SANDBOX';
  return '⚠️  UNKNOWN';
}

// ─── Fetch Existing Plans ───────────────────────────────────────────────────

/**
 * Fetches all existing plans from Razorpay and returns them.
 * Uses pagination to ensure we get all plans.
 */
async function fetchAllExistingPlans(rzp) {
  const allPlans = [];
  let skip = 0;
  const count = 100; // Max per request

  while (true) {
    const batch = await rzp.plans.all({ count, skip });
    if (!batch.items || batch.items.length === 0) break;
    allPlans.push(...batch.items);
    if (batch.items.length < count) break;
    skip += count;
  }

  return allPlans;
}

/**
 * Finds an existing Razorpay plan that matches our definition.
 * Matches by: item name + amount + currency + period + interval.
 * This is the core idempotency mechanism.
 */
function findMatchingPlan(existingPlans, planDef) {
  return existingPlans.find(
    (p) =>
      p.item?.name === planDef.razorpay.item.name &&
      p.item?.amount === planDef.razorpay.item.amount &&
      p.item?.currency === planDef.razorpay.item.currency &&
      p.period === planDef.razorpay.period &&
      p.interval === planDef.razorpay.interval
  );
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

function formatAmount(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function formatPlanSummary(planDef) {
  const { item, period, interval } = planDef.razorpay;
  return `${item.name} — ${formatAmount(item.amount)}/${period} (interval: ${interval})`;
}

// ─── Commands ───────────────────────────────────────────────────────────────

/**
 * LIST — Show all existing plans on Razorpay.
 */
async function commandList(rzp) {
  console.log('');
  console.log('  📋 Fetching all plans from Razorpay...');
  console.log('');

  const plans = await fetchAllExistingPlans(rzp);

  if (plans.length === 0) {
    console.log('  No plans found on Razorpay.');
    console.log('');
    return;
  }

  console.log(`  Found ${plans.length} plan(s):`);
  console.log('');
  console.log(
    '  ' +
      'Plan ID'.padEnd(28) +
      'Name'.padEnd(28) +
      'Amount'.padEnd(12) +
      'Period'.padEnd(12) +
      'Created'
  );
  console.log('  ' + '─'.repeat(92));

  for (const plan of plans) {
    const created = new Date(plan.created_at * 1000).toISOString().split('T')[0];
    console.log(
      '  ' +
        (plan.id || '').padEnd(28) +
        (plan.item?.name || 'N/A').padEnd(28) +
        formatAmount(plan.item?.amount || 0).padEnd(12) +
        `${plan.period}/${plan.interval}`.padEnd(12) +
        created
    );
  }

  console.log('');

  // Show which plans match our definitions
  console.log('  EverCut plan mapping:');
  console.log('');

  for (const planDef of EVERCUT_PLANS) {
    const match = findMatchingPlan(plans, planDef);
    if (match) {
      console.log(`  ✅ ${planDef.planId} → ${match.id} (${match.item.name})`);
    } else {
      console.log(`  ❌ ${planDef.planId} → NOT FOUND (needs creation)`);
    }
  }

  console.log('');
}

/**
 * DRY RUN — Show what would be created without actually creating anything.
 */
async function commandDryRun(rzp) {
  console.log('');
  console.log('  🔍 DRY RUN — Checking what needs to be created...');
  console.log('');

  const existingPlans = await fetchAllExistingPlans(rzp);
  console.log(`  Found ${existingPlans.length} existing plan(s) on Razorpay.`);
  console.log('');

  let toCreate = 0;
  let toSkip = 0;

  for (const planDef of EVERCUT_PLANS) {
    const existing = findMatchingPlan(existingPlans, planDef);

    if (existing) {
      toSkip++;
      console.log(`  ⏭️  SKIP: ${formatPlanSummary(planDef)}`);
      console.log(`         Already exists as: ${existing.id}`);
      console.log(`         Env var: ${planDef.envVar}=${existing.id}`);
    } else {
      toCreate++;
      console.log(`  🆕 CREATE: ${formatPlanSummary(planDef)}`);
      console.log(`         Will assign to: ${planDef.envVar}`);
    }
    console.log('');
  }

  console.log('  ─────────────────────────────────────────────────');
  console.log(`  Summary: ${toCreate} to create, ${toSkip} already exist`);
  console.log('');

  if (toCreate > 0) {
    console.log('  To execute, run:');
    console.log('  node scripts/create-razorpay-plans.mjs --execute');
  } else {
    console.log('  ✅ All plans already exist. Nothing to create.');
    console.log('');
    console.log('  Add these to your server/.env:');
    console.log('');
    for (const planDef of EVERCUT_PLANS) {
      const existing = findMatchingPlan(existingPlans, planDef);
      if (existing) {
        console.log(`  ${planDef.envVar}=${existing.id}`);
      }
    }
  }

  console.log('');
}

/**
 * EXECUTE — Actually create plans on Razorpay.
 */
async function commandExecute(rzp) {
  const env = requireRazorpayEnvironment();
  assertRazorpayKeyMatchesEnvironment(env);

  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════════╗');
  console.log('  ║  EverCut — Razorpay Plan Provisioning                     ║');
  console.log('  ╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Environment:  ${formatRazorpayEnvironment(env)}`);
  console.log(`  Key ID:       ${(process.env.RAZORPAY_KEY_ID || '').substring(0, 16)}...`);
  console.log('');

  // Safety gate for production
  if (env === 'PRODUCTION') {
    console.log('  ⚠️  WARNING: You are about to create plans in PRODUCTION mode!');
    console.log('  This will create real billing plans that can charge real money.');
    console.log('');
    console.log('  To proceed, set the environment variable:');
    console.log('  RAZORPAY_CONFIRM_PRODUCTION=true');
    console.log('');

    if (process.env.RAZORPAY_CONFIRM_PRODUCTION !== 'true') {
      console.log('  Aborting. Set RAZORPAY_CONFIRM_PRODUCTION=true to proceed.');
      console.log('');
      process.exit(1);
    }
  }

  // Fetch existing plans for idempotency
  console.log('  📋 Checking existing plans...');
  const existingPlans = await fetchAllExistingPlans(rzp);
  console.log(`     Found ${existingPlans.length} existing plan(s).`);
  console.log('');

  const results = [];

  for (const planDef of EVERCUT_PLANS) {
    const existing = findMatchingPlan(existingPlans, planDef);

    if (existing) {
      console.log(`  ⏭️  ${planDef.planId}: Already exists → ${existing.id}`);
      results.push({
        planId: planDef.planId,
        envVar: planDef.envVar,
        razorpayPlanId: existing.id,
        action: 'SKIPPED',
      });
      continue;
    }

    try {
      console.log(`  📦 ${planDef.planId}: Creating "${planDef.razorpay.item.name}"...`);

      const created = await rzp.plans.create(planDef.razorpay);

      console.log(`  ✅ ${planDef.planId}: Created → ${created.id}`);

      results.push({
        planId: planDef.planId,
        envVar: planDef.envVar,
        razorpayPlanId: created.id,
        action: 'CREATED',
      });
    } catch (error) {
      const errMsg = error?.error?.description || error.message || 'Unknown error';
      const errCode = error?.error?.code || 'N/A';
      console.error(`  ❌ ${planDef.planId}: FAILED — ${errMsg} (code: ${errCode})`);

      results.push({
        planId: planDef.planId,
        envVar: planDef.envVar,
        razorpayPlanId: null,
        action: 'FAILED',
        error: errMsg,
      });
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────

  console.log('');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('');

  const created = results.filter((r) => r.action === 'CREATED');
  const skipped = results.filter((r) => r.action === 'SKIPPED');
  const failed = results.filter((r) => r.action === 'FAILED');

  if (created.length > 0) {
    console.log(`  🆕 Created: ${created.length}`);
    for (const r of created) console.log(`     ${r.planId} → ${r.razorpayPlanId}`);
    console.log('');
  }

  if (skipped.length > 0) {
    console.log(`  ⏭️  Skipped (already exist): ${skipped.length}`);
    for (const r of skipped) console.log(`     ${r.planId} → ${r.razorpayPlanId}`);
    console.log('');
  }

  if (failed.length > 0) {
    console.log(`  ❌ Failed: ${failed.length}`);
    for (const r of failed) console.log(`     ${r.planId}: ${r.error}`);
    console.log('');
  }

  // ─── .env Instructions ────────────────────────────────────────────────

  const successful = results.filter((r) => r.razorpayPlanId);

  if (successful.length > 0) {
    console.log('  ─────────────────────────────────────────────────────────');
    console.log('  📝 Add these to your server/.env file:');
    console.log('');
    for (const r of successful) {
      console.log(`  ${r.envVar}=${r.razorpayPlanId}`);
    }
    console.log('');
    console.log('  Then restart your server for the changes to take effect.');
  }

  if (failed.length > 0) {
    console.log('');
    console.log('  ⚠️  Some plans failed. Fix the errors and re-run.');
    console.log('  This script is idempotent — successfully created plans');
    console.log('  will be skipped on re-run.');
  }

  console.log('');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '';

  const env = requireRazorpayEnvironment();
  assertRazorpayKeyMatchesEnvironment(env);

  // Header
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════════╗');
  console.log('  ║  EverCut — Razorpay Plan Provisioning                     ║');
  console.log('  ╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Environment: ${formatRazorpayEnvironment(env)}`);
  console.log(`  Plans to provision: ${EVERCUT_PLANS.length} (Popular, Advanced)`);
  console.log(`  Basic plan: Free — no Razorpay plan needed`);
  console.log('');

  const rzp = createRazorpayClient();

  switch (command) {
    case '--list':
      await commandList(rzp);
      break;

    case '--execute':
      await commandExecute(rzp);
      break;

    case '--help':
      printHelp();
      break;

    default:
      // Default is dry run (safe)
      await commandDryRun(rzp);
      break;
  }
}

function printHelp() {
  console.log('  Usage:');
  console.log('');
  console.log('    node scripts/create-razorpay-plans.mjs              Dry run (default, safe)');
  console.log('    node scripts/create-razorpay-plans.mjs --execute    Create plans on Razorpay');
  console.log('    node scripts/create-razorpay-plans.mjs --list       List existing plans');
  console.log('    node scripts/create-razorpay-plans.mjs --help       Show this help');
  console.log('');
  console.log('  The script is idempotent — running --execute multiple times');
  console.log('  will NOT create duplicate plans.');
  console.log('');
  console.log('  For PRODUCTION mode, you must also set:');
  console.log('    RAZORPAY_CONFIRM_PRODUCTION=true');
  console.log('');
}

// ─── Run ────────────────────────────────────────────────────────────────────

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('');
    console.error(`  ❌ Unexpected error: ${err.message}`);
    console.error('');
    if (err.stack) {
      console.error('  Stack trace:');
      console.error(
        err.stack
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n')
      );
      console.error('');
    }
    process.exit(1);
  });
