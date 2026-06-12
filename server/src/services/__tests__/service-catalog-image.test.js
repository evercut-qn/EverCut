import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import serviceDefaultImageRepository from '../../repositories/service-default-image.repository.js';
import * as serviceCatalog from '../service-catalog.service.js';
import shopRepository from '../../repositories/shop.repository.js';
import serviceRepository from '../../repositories/service.repository.js';
import mediaRepository from '../../repositories/media.repository.js';

describe('ServiceCatalog Image Resolution', () => {
    it('addService: should resolve default image when no imageMediaId provided', async (t) => {
        const ownerId = 'owner-123';
        const shopId = 'shop-123';
        const serviceData = {
            serviceName: 'Premium Fade',
            serviceType: 'single',
            serviceFor: 'men',
            actualPrice: 500
        };

        t.mock.method(shopRepository, 'findByBarberUserId', () => ({ _id: shopId }));
        t.mock.method(serviceRepository, 'findByShopIdAndName', () => null);
        t.mock.method(mediaRepository, 'findByR2Key', async (r2Key) => ({
            _id: `system-${r2Key}`,
            r2Key,
        }));
        t.mock.method(serviceRepository, 'create', (data) => {
            return {
                ...data,
                populate: async function() {
                    this.imageMediaId = {
                        _id: this.imageMediaId,
                        r2Key: this.imageMediaId.replace('system-', '')
                    };
                    return this;
                }
            };
        });
        
        t.mock.method(serviceDefaultImageRepository, 'findBestMatch', (name, type, gender) => {
            assert.equal(name, 'Premium Fade');
            assert.equal(type, 'single');
            assert.equal(gender, 'men');
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

        t.mock.method(shopRepository, 'findByBarberUserId', () => ({ _id: shopId }));
        t.mock.method(serviceRepository, 'findByShopIdAndName', () => null);
        t.mock.method(mediaRepository, 'findByR2Key', async (r2Key) => ({
            _id: `system-${r2Key}`,
            r2Key,
        }));
        t.mock.method(serviceRepository, 'create', (data) => {
            return {
                ...data,
                populate: async function() {
                    this.imageMediaId = {
                        _id: this.imageMediaId,
                        r2Key: this.imageMediaId.replace('system-', '')
                    };
                    return this;
                }
            };
        });
        
        t.mock.method(serviceDefaultImageRepository, 'findBestMatch', () => null);
        t.mock.method(serviceDefaultImageRepository, 'findByName', (name) => {
            // Concatenated: haircutshave (sorted)
            if (name === 'haircutshave') return { r2Key: 'bundled-exact-key' };
            return null;
        });

        const result = await serviceCatalog.addService(ownerId, serviceData);
        assert.equal(result.imageUrl.includes('bundled-exact-key'), true);
    });

    it('searchServices: should request fields required for complete service cards', async (t) => {
        let capturedSelectFields = null;

        t.mock.method(serviceRepository, 'searchByName', (query, filters, selectFields) => {
            capturedSelectFields = selectFields;
            return [
                {
                    _id: 'service-1',
                    serviceName: 'Premium Fade',
                    serviceType: 'single',
                    serviceFor: 'men',
                    imageMediaId: {
                        _id: 'media-1',
                        r2Key: 'images/services/premium-fade.jpg',
                    },
                    duration: 45,
                    actualPrice: 500,
                    offerPrice: 100,
                    finalPrice: 400,
                    shopId: {
                        _id: 'shop-1',
                        shopName: 'EverCut Studio',
                        coverMediaId: {
                            _id: 'media-shop-cover',
                            r2Key: 'shops/cover.jpg',
                        },
                    },
                },
            ];
        });

        const result = await serviceCatalog.searchServices('fade', 'men');

        for (const field of [
            'serviceName',
            'serviceFor',
            'serviceType',
            'imageMediaId',
            'duration',
            'actualPrice',
            'offerPrice',
            'finalPrice',
            'totalDuration',
            'totalPrice',
            'bundledServices',
            'shopId',
        ]) {
            assert.match(capturedSelectFields, new RegExp(`\\b${field}\\b`));
        }

        assert.equal(result[0].imageUrl.includes('images/services/premium-fade.jpg'), true);
        assert.equal(result[0].actualPrice, 500);
        assert.equal(result[0].finalPrice, 400);
        assert.equal(result[0].shop.coverUrl.includes('shops/cover.jpg'), true);
    });
});
