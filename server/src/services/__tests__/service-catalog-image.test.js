import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import serviceDefaultImageRepository from '../../repositories/service-default-image.repository.js';
import * as serviceCatalog from '../service-catalog.service.js';

// Access the private function via the exported ones or by re-exporting it for test
// For this test, I'll mock the repository and verify if it's called correctly by addService

import shopRepository from '../../repositories/shop.repository.js';
import serviceRepository from '../../repositories/service.repository.js';

describe('ServiceCatalog Image Resolution', () => {
    it('addService: should resolve default image when no imageMediaId provided', async (t) => {
        const ownerId = 'owner-123';
        const shopId = 'shop-123';
        const serviceData = {
            serviceName: 'Premium Fade',
            serviceType: 'single',
            serviceFor: 'male',
            actualPrice: 500
        };

        t.mock.method(shopRepository, 'findByOwnerId', () => ({ _id: shopId }));
        t.mock.method(serviceRepository, 'findByShopIdAndName', () => null);
        t.mock.method(serviceRepository, 'create', (data) => data);
        
        t.mock.method(serviceDefaultImageRepository, 'findBestMatch', (name, type, gender) => {
            assert.equal(name, 'Premium Fade');
            assert.equal(type, 'single');
            assert.equal(gender, 'male');
            return { r2Key: 'resolved-male-key' };
        });

        const result = await serviceCatalog.addService(ownerId, serviceData);
        assert.equal(result.imageUrl.includes('resolved-male-key'), true);
    });

    it('addService: should respect bundled service logic for images', async (t) => {
        const ownerId = 'owner-123';
        const shopId = 'shop-123';
        const serviceData = {
            serviceName: 'Custom Bundle',
            serviceType: 'bundled',
            serviceFor: 'unisex',
            bundledServices: ['Haircut', 'Shave'],
            actualPrice: 800
        };

        t.mock.method(shopRepository, 'findByOwnerId', () => ({ _id: shopId }));
        t.mock.method(serviceRepository, 'findByShopIdAndName', () => null);
        t.mock.method(serviceRepository, 'create', (data) => data);
        
        t.mock.method(serviceDefaultImageRepository, 'findBestMatch', () => null);
        t.mock.method(serviceDefaultImageRepository, 'findByName', (name) => {
            // Concatenated: haircutshave (sorted)
            if (name === 'haircutshave') return { r2Key: 'bundled-exact-key' };
            return null;
        });

        const result = await serviceCatalog.addService(ownerId, serviceData);
        assert.equal(result.imageUrl.includes('bundled-exact-key'), true);
    });
});
