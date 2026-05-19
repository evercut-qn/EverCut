import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repositoryPath = path.resolve('src/repositories/booking.repository.js');

test('booking list population includes employee media keys for booking serializers', async () => {
    const source = await readFile(repositoryPath, 'utf8');

    assert.match(
        source,
        /const EMPLOYEE_NAME_POPULATE = \{[\s\S]*select: 'firstName lastName photoR2Key blockedDates'/,
    );
});

test('booking status population includes employee media keys for confirmed booking lists', async () => {
    const source = await readFile(repositoryPath, 'utf8');

    assert.match(
        source,
        /findByStatusForShop\(shopId, status[\s\S]*\.populate\(EMPLOYEE_NAME_POPULATE\)/,
    );
});

test('booking customer population includes customer media keys for summaries', async () => {
    const source = await readFile(repositoryPath, 'utf8');

    assert.match(source, /const CUSTOMER_SUMMARY_FIELDS = 'firstName lastName photoR2Key userId'/);
    assert.match(source, /const CUSTOMER_NAME_FIELDS = 'firstName lastName photoR2Key'/);
});
