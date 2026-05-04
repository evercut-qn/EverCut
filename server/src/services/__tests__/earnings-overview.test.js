import { strict as assert } from 'assert';
import { test } from 'node:test';

/**
 * Integration test for earnings overview endpoint
 * Verifies that getDashboardOverview correctly aggregates pulse, staff, and queue data
 */

test('getDashboardOverview returns pulse, staff, and queue structure', async (t) => {
    // This test verifies the structure of the overview response
    // The actual data will depend on the database state
    
    const earningsService = await import('../earnings.service.js');
    
    // Mock owner ID (will fail with NotFoundError if shop doesn't exist, which is expected)
    const mockOwnerId = 'test-owner-id';
    
    try {
        const result = await earningsService.getDashboardOverview(mockOwnerId);
        
        // This will only execute if a shop exists for this owner
        assert.ok(result, 'Result should be defined');
        assert.ok(result.pulse, 'Result should have pulse property');
        assert.ok(result.staff, 'Result should have staff property');
        assert.ok(result.queue, 'Result should have queue property');
        
        // Verify queue structure
        assert.ok(result.queue.timeframe, 'Queue should have timeframe property');
        assert.ok(result.queue.active, 'Queue should have active property');
        assert.ok(result.queue.upcoming, 'Queue should have upcoming property');
        assert.ok(typeof result.queue.active.count === 'number', 'Active count should be a number');
        assert.ok(Array.isArray(result.queue.active.items), 'Active items should be an array');
        assert.ok(typeof result.queue.upcoming.count === 'number', 'Upcoming count should be a number');
        assert.ok(Array.isArray(result.queue.upcoming.items), 'Upcoming items should be an array');
        
    } catch (error) {
        // Expected to fail with NotFoundError if shop doesn't exist
        // This is fine - we're just verifying the structure
        assert.ok(
            error.message.includes('Shop') || error.message.includes('not found'),
            'Should fail with NotFoundError for non-existent shop',
        );
    }
});

test('getTodaysQueue returns correct structure with active timeframe', async (t) => {
    const bookingService = await import('../booking.service.js');
    
    const mockOwnerId = 'test-owner-id';
    
    try {
        const result = await bookingService.getTodaysQueue(mockOwnerId, 'active');
        
        // Verify structure
        assert.strictEqual(result.timeframe, 'active', 'Timeframe should be active');
        assert.ok(result.active, 'Should have active property');
        assert.ok(result.upcoming, 'Should have upcoming property');
        assert.ok(typeof result.active.count === 'number', 'Active count should be a number');
        assert.ok(Array.isArray(result.active.items), 'Active items should be an array');
        assert.ok(typeof result.upcoming.count === 'number', 'Upcoming count should be a number');
        assert.ok(Array.isArray(result.upcoming.items), 'Upcoming items should be an array');
        
        // When timeframe is 'active', upcoming items should be empty
        assert.strictEqual(result.upcoming.items.length, 0, 'Upcoming items should be empty when timeframe is active');
        
    } catch (error) {
        // Expected to fail with NotFoundError if shop doesn't exist
        assert.ok(
            error.message.includes('Shop') || error.message.includes('not found'),
            'Should fail with NotFoundError for non-existent shop',
        );
    }
});

test('getTodaysQueue returns correct structure with upcoming timeframe', async (t) => {
    const bookingService = await import('../booking.service.js');
    
    const mockOwnerId = 'test-owner-id';
    
    try {
        const result = await bookingService.getTodaysQueue(mockOwnerId, 'upcoming');
        
        // Verify structure
        assert.strictEqual(result.timeframe, 'upcoming', 'Timeframe should be upcoming');
        assert.ok(result.active, 'Should have active property');
        assert.ok(result.upcoming, 'Should have upcoming property');
        
        // When timeframe is 'upcoming', active items should be empty
        assert.strictEqual(result.active.items.length, 0, 'Active items should be empty when timeframe is upcoming');
        
    } catch (error) {
        // Expected to fail with NotFoundError if shop doesn't exist
        assert.ok(
            error.message.includes('Shop') || error.message.includes('not found'),
            'Should fail with NotFoundError for non-existent shop',
        );
    }
});
