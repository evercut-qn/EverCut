import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildMonthlyStatistics,
    calculateGrowthPercentage,
    getLastCompletedMonths,
    sumMonthlyStatistics,
} from '../month-analytics.utils.js';

test('getLastCompletedMonths returns exactly six completed UTC months across years', () => {
    const months = getLastCompletedMonths({
        now: new Date('2026-05-30T12:00:00.000Z'),
        count: 6,
    });

    assert.deepEqual(
        months.map(({ key, monthName }) => ({ key, monthName })),
        [
            { key: '2025-11', monthName: 'November' },
            { key: '2025-12', monthName: 'December' },
            { key: '2026-01', monthName: 'January' },
            { key: '2026-02', monthName: 'February' },
            { key: '2026-03', monthName: 'March' },
            { key: '2026-04', monthName: 'April' },
        ],
    );
    assert.equal(months[0].startDate.toISOString(), '2025-11-01T00:00:00.000Z');
    assert.equal(months.at(-1).endDate.toISOString(), '2026-05-01T00:00:00.000Z');
});

test('buildMonthlyStatistics fills missing months with zero and preserves chronological order', () => {
    const months = getLastCompletedMonths({
        now: new Date('2026-05-30T12:00:00.000Z'),
        count: 6,
    });

    const statistics = buildMonthlyStatistics({
        months,
        rows: [
            { year: 2025, month: 12, value: 125 },
            { year: 2026, month: 4, value: 197 },
            { year: 2026, month: 2, value: 128 },
        ],
        valueKey: 'value',
        outputKey: 'count',
    });

    assert.deepEqual(statistics, [
        { month: 'November', count: 0 },
        { month: 'December', count: 125 },
        { month: 'January', count: 0 },
        { month: 'February', count: 128 },
        { month: 'March', count: 0 },
        { month: 'April', count: 197 },
    ]);
});

test('sumMonthlyStatistics totals numeric values and ignores missing fields', () => {
    assert.equal(
        sumMonthlyStatistics([
            { month: 'November', amount: 10 },
            { month: 'December', amount: 15.5 },
            { month: 'January' },
        ], 'amount'),
        25.5,
    );
});

test('calculateGrowthPercentage handles positive, negative, flat, and zero-baseline cases', () => {
    assert.equal(calculateGrowthPercentage(150, 180), 20);
    assert.equal(calculateGrowthPercentage(200, 150), -25);
    assert.equal(calculateGrowthPercentage(125, 125), 0);
    assert.equal(calculateGrowthPercentage(0, 50), 100);
    assert.equal(calculateGrowthPercentage(0, 0), 0);
});
