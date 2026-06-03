const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
});

const toYearMonthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

const normalizeRoundedNumber = (value) => (Object.is(value, -0) ? 0 : value);

export const getLastCompletedMonths = ({
    now = new Date(),
    count = 6,
} = {}) => {
    const currentMonthStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
    ));

    return Array.from({ length: count }, (_, index) => {
        const monthOffset = count - index;
        const startDate = new Date(Date.UTC(
            currentMonthStart.getUTCFullYear(),
            currentMonthStart.getUTCMonth() - monthOffset,
            1,
        ));
        const endDate = new Date(Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth() + 1,
            1,
        ));
        const year = startDate.getUTCFullYear();
        const month = startDate.getUTCMonth() + 1;

        return {
            key: toYearMonthKey(year, month),
            year,
            month,
            monthName: MONTH_NAME_FORMATTER.format(startDate),
            startDate,
            endDate,
        };
    });
};

export const buildMonthlyStatistics = ({
    months,
    rows = [],
    valueKey,
    outputKey,
}) => {
    const valuesByMonth = new Map(
        rows.map((row) => [
            toYearMonthKey(Number(row.year), Number(row.month)),
            Number(row[valueKey]) || 0,
        ]),
    );

    return months.map((month) => ({
        month: month.monthName,
        [outputKey]: valuesByMonth.get(month.key) || 0,
    }));
};

export const sumMonthlyStatistics = (statistics = [], valueKey) => statistics.reduce(
    (sum, row) => sum + (Number(row[valueKey]) || 0),
    0,
);

export const calculateGrowthPercentage = (previousValue, currentValue) => {
    const previous = Number(previousValue) || 0;
    const current = Number(currentValue) || 0;

    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }

    return normalizeRoundedNumber(
        Number((((current - previous) / previous) * 100).toFixed(1)),
    );
};
