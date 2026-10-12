import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('consumeFeeWaiverSlot does not specify runValidators option', () => {
    const repoPath = path.resolve(__dirname, '../customer.repository.js');
    const source = fs.readFileSync(repoPath, 'utf8');

    // Extract consumeFeeWaiverSlot implementation block
    const match = source.match(/async consumeFeeWaiverSlot[\s\S]*?\n    }/);
    assert.ok(match, 'consumeFeeWaiverSlot method must exist');

    const methodBody = match[0];
    assert.doesNotMatch(
        methodBody,
        /runValidators:\s*true/,
        'consumeFeeWaiverSlot must NOT use runValidators: true because Mongoose tries to cast query operator objects ($lt)',
    );
});
