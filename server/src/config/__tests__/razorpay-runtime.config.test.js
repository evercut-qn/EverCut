import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { ensureRequiredEnv } from '../../__tests__/helpers/env.js';

ensureRequiredEnv();

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', '..');
const serverDir = path.resolve(srcDir, '..');

async function withRazorpayEnv(overrides, callback) {
    const previousValues = {};

    for (const key of Object.keys(overrides)) {
        previousValues[key] = process.env[key];
        if (overrides[key] === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = overrides[key];
        }
    }

    try {
        return await callback();
    } finally {
        for (const key of Object.keys(overrides)) {
            if (previousValues[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = previousValues[key];
            }
        }
    }
}

test('Razorpay environment labels follow shared SANDBOX/PRODUCTION provider convention', async () => {
    const config = (await import('../index.js')).default;

    assert.equal(config.razorpay.env, 'SANDBOX');
});

test('Razorpay environment is mandatory and never defaults from code or key prefix', async () => {
    await withRazorpayEnv(
        {
            RAZORPAY_ENV: '',
            RAZORPAY_KEY_ID: 'rzp_test_required_env_key',
        },
        async () => {
            await assert.rejects(
                () => import(`../index.js?razorpay-env-required-${Date.now()}`),
                /Missing required environment variable: RAZORPAY_ENV/,
            );
        },
    );
});

test('unsupported Razorpay TEST/LIVE labels are rejected instead of normalized', async (t) => {
    for (const legacyEnv of ['TEST', 'LIVE']) {
        await t.test(`rejects ${legacyEnv}`, async () => {
            await withRazorpayEnv(
                {
                    RAZORPAY_ENV: legacyEnv,
                    RAZORPAY_KEY_ID: legacyEnv === 'LIVE' ? 'rzp_live_legacy_key' : 'rzp_test_legacy_key',
                },
                async () => {
                    await assert.rejects(
                        () => import(`../index.js?legacy-${legacyEnv.toLowerCase()}-${Date.now()}`),
                        /RAZORPAY_ENV must be SANDBOX or PRODUCTION/,
                    );
                },
            );
        });
    }
});

test('Razorpay key prefix must match the configured provider environment', async () => {
    await withRazorpayEnv(
        {
            RAZORPAY_ENV: 'PRODUCTION',
            RAZORPAY_KEY_ID: 'rzp_test_mismatch_key',
        },
        async () => {
            await assert.rejects(
                () => import(`../index.js?razorpay-env-mismatch-${Date.now()}`),
                /RAZORPAY_KEY_ID is a test key but RAZORPAY_ENV is PRODUCTION/,
            );
        },
    );
});

test('Razorpay plan provisioning script uses standardized SANDBOX/PRODUCTION labels', async () => {
    const scriptSource = await readFile(path.join(serverDir, 'scripts', 'create-razorpay-plans.mjs'), 'utf8');
    const configSource = await readFile(path.join(srcDir, 'config', 'index.js'), 'utf8');

    assert.match(scriptSource, /RAZORPAY_ENV/);
    assert.match(scriptSource, /SANDBOX/);
    assert.match(scriptSource, /PRODUCTION/);
    assert.match(scriptSource, /RAZORPAY_CONFIRM_PRODUCTION/);
    assert.doesNotMatch(configSource, /resolveRazorpayEnv/);
    assert.doesNotMatch(configSource, /optionalEnv\('RAZORPAY_ENV'/);
    assert.doesNotMatch(scriptSource, /resolveConfiguredRazorpayEnvironment/);
    assert.doesNotMatch(scriptSource, /detectRazorpayEnvironment/);
    assert.doesNotMatch(scriptSource, /['"`]TEST['"`]/);
    assert.doesNotMatch(scriptSource, /['"`]LIVE['"`]/);
});

test('Razorpay plan provisioning script requires RAZORPAY_ENV before provisioning', async () => {
    const scriptPath = path.join(serverDir, 'scripts', 'create-razorpay-plans.mjs');

    await assert.rejects(
        () => execFileAsync(
            process.execPath,
            [scriptPath],
            {
                cwd: serverDir,
                env: {
                    ...process.env,
                    RAZORPAY_ENV: '',
                    RAZORPAY_KEY_ID: 'rzp_test_required_env_key',
                    RAZORPAY_KEY_SECRET: 'required-env-secret',
                },
            },
        ),
        (error) => {
            assert.match(`${error.stdout}\n${error.stderr}`, /Missing required environment variable: RAZORPAY_ENV/);
            return true;
        },
    );
});

test('Razorpay plan provisioning script rejects unsupported TEST/LIVE labels before provisioning', async (t) => {
    const scriptPath = path.join(serverDir, 'scripts', 'create-razorpay-plans.mjs');

    for (const legacyEnv of ['TEST', 'LIVE']) {
        await t.test(`rejects ${legacyEnv}`, async () => {
            await assert.rejects(
                () => execFileAsync(
                    process.execPath,
                    [scriptPath],
                    {
                        cwd: serverDir,
                        env: {
                            ...process.env,
                            RAZORPAY_ENV: legacyEnv,
                            RAZORPAY_KEY_ID: legacyEnv === 'LIVE' ? 'rzp_live_legacy_key' : 'rzp_test_legacy_key',
                            RAZORPAY_KEY_SECRET: 'legacy-secret',
                        },
                    },
                ),
                (error) => {
                    assert.match(`${error.stdout}\n${error.stderr}`, /RAZORPAY_ENV must be SANDBOX or PRODUCTION/);
                    return true;
                },
            );
        });
    }
});

test('subscription job timings are centralized constants, not environment-managed knobs', async () => {
    const configSource = await readFile(path.join(srcDir, 'config', 'index.js'), 'utf8');
    const envExample = await readFile(path.join(serverDir, '.env.example'), 'utf8');

    for (const key of [
        'SUBSCRIPTION_EXPIRY_CHECK_INTERVAL_MS',
        'SUBSCRIPTION_RECONCILIATION_CRON',
        'SUBSCRIPTION_MEDIA_RECONCILIATION_CRON',
        'SUBSCRIPTION_CRON_TIMEZONE',
        'RAZORPAY_WEBHOOK_TIMESTAMP_TOLERANCE_SEC',
    ]) {
        assert.doesNotMatch(configSource, new RegExp(`optionalEnv\\('${key}'`));
        assert.doesNotMatch(envExample, new RegExp(key));
    }
});
