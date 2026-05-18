import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import ServiceDefaultImage from '../../models/service-default-image.model.js';
import serviceDefaultImageRepository from '../service-default-image.repository.js';

describe('ServiceDefaultImageRepository', () => {
    it('findBestMatch: exact name match should take precedence', async (t) => {
        t.mock.method(ServiceDefaultImage, 'findOne', (query) => {
            if (query.name === 'premiumhaircut' && query.serviceFor === 'male') {
                return { lean: () => ({ r2Key: 'exact-match-key' }) };
            }
            return { lean: () => null };
        });

        const result = await serviceDefaultImageRepository.findBestMatch('Premium Haircut', 'single', 'male');
        assert.equal(result.r2Key, 'exact-match-key');
    });

    it('findBestMatch: fuzzy keyword match should be used if exact name fails', async (t) => {
        let findOneCalls = 0;
        t.mock.method(ServiceDefaultImage, 'findOne', (query) => {
            findOneCalls++;
            // First call is exact match (fails)
            if (findOneCalls === 1) return { lean: () => null };
            // Second call is fuzzy text search
            if (query.$text && query.$text.$search === 'Fade Cut' && query.serviceFor === 'male') {
                return {
                    sort: () => ({
                        lean: () => ({ r2Key: 'fuzzy-match-key', score: 0.8 })
                    })
                };
            }
            return { lean: () => null };
        });

        const result = await serviceDefaultImageRepository.findBestMatch('Fade Cut', 'single', 'male');
        assert.equal(result.r2Key, 'fuzzy-match-key');
    });

    it('findBestMatch: fallback to global gender default if exact and fuzzy fail', async (t) => {
        let findOneCalls = 0;
        t.mock.method(ServiceDefaultImage, 'findOne', (query) => {
            findOneCalls++;
            // 1. Exact match fail
            if (findOneCalls === 1) return { lean: () => null };
            // 2. Fuzzy match fail
            if (findOneCalls === 2) return { sort: () => ({ lean: () => null }) };
            // 3. Global gender fallback success
            if (query.isGlobalDefault === true && query.serviceFor === 'male') {
                return { lean: () => ({ r2Key: 'global-male-key' }) };
            }
            return { lean: () => null };
        });

        const result = await serviceDefaultImageRepository.findBestMatch('Unknown Service', 'single', 'male');
        assert.equal(result.r2Key, 'global-male-key');
    });

    it('findBestMatch: absolute fallback to global unisex if gender-specific global default is missing', async (t) => {
        let findOneCalls = 0;
        t.mock.method(ServiceDefaultImage, 'findOne', (query) => {
            findOneCalls++;
            // 1. Exact match fail
            if (findOneCalls === 1) return { lean: () => null };
            // 2. Fuzzy match fail
            if (findOneCalls === 2) return { sort: () => ({ lean: () => null }) };
            // 3. Global gender fallback fail
            if (findOneCalls === 3) return { lean: () => null };
            // 4. Absolute unisex fallback success
            if (query.isGlobalDefault === true && query.serviceFor === 'unisex') {
                return { lean: () => ({ r2Key: 'global-unisex-key' }) };
            }
            return { lean: () => null };
        });

        const result = await serviceDefaultImageRepository.findBestMatch('Unknown Service', 'single', 'female');
        assert.equal(result.r2Key, 'global-unisex-key');
    });
});
