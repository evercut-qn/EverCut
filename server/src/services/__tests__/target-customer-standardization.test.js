import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import { barberOnboardingSchema } from '../../validators/onboarding.validator.js';
import { addServiceSchema } from '../../validators/service.validator.js';
import { servicesByGenderQuerySchema } from '../../validators/shop.validator.js';
import { SERVICE_FOR, GENDER } from '../../utils/constants.js';

describe('Target Customer Standardization (Lowercase Slugs)', () => {
    
    describe('Validator Compliance', () => {
        
        it('should accept lowercase "men", "women", "unisex" in barber onboarding', () => {
            const basePayload = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                gender: 'male',
                dateOfBirth: '1990-01-01',
                shopName: 'Test Shop',
                category: 'Barber Shop',
                upiId: 'test@upi',
                accountHolderName: 'John Doe',
                bankName: 'Test Bank',
                address: 'Test Address',
                location: { type: 'Point', coordinates: [0, 0] },
                workingDays: ['Monday'],
                openTime: '09:00',
                closeTime: '18:00',
                photoMediaId: 'media-1',
                pin: '1234',
                confirmPin: '1234'
            };

            ['men', 'women', 'unisex'].forEach(value => {
                const { error } = barberOnboardingSchema.validate({ ...basePayload, targetCustomers: value });
                assert.equal(error, undefined, `Should accept lowercase "${value}"`);
            });
        });

        it('should REJECT capitalized "Men", "Women", "Unisex" in barber onboarding', () => {
             const basePayload = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                gender: 'male',
                dateOfBirth: '1990-01-01',
                shopName: 'Test Shop',
                category: 'Barber Shop',
                upiId: 'test@upi',
                accountHolderName: 'John Doe',
                bankName: 'Test Bank',
                address: 'Test Address',
                location: { type: 'Point', coordinates: [0, 0] },
                workingDays: ['Monday'],
                openTime: '09:00',
                closeTime: '18:00',
                photoMediaId: 'media-1',
                pin: '1234',
                confirmPin: '1234'
            };

            ['Men', 'Women', 'Unisex'].forEach(value => {
                const { error } = barberOnboardingSchema.validate({ ...basePayload, targetCustomers: value });
                assert.ok(error, `Should REJECT capitalized "${value}"`);
                assert.match(error.message, /targetCustomers/);
            });
        });

        it('should accept lowercase in service creation', () => {
            const baseService = {
                serviceName: 'Fade Cut',
                serviceType: 'single',
                actualPrice: 500,
                duration: 30
            };

            ['men', 'women', 'unisex'].forEach(value => {
                const { error } = addServiceSchema.validate({ ...baseService, serviceFor: value });
                assert.equal(error, undefined, `Should accept lowercase "${value}" in serviceFor`);
            });
        });

        it('should accept lowercase in nearby services query', () => {
            ['men', 'women', 'unisex'].forEach(value => {
                const { error } = servicesByGenderQuerySchema.validate({ 
                    longitude: 0, 
                    latitude: 0, 
                    gender: value 
                });
                assert.equal(error, undefined, `Should accept lowercase "${value}" in query`);
            });
        });
    });

    describe('Constant Integrity', () => {
        it('SERVICE_FOR constants must be lowercase', () => {
            assert.equal(SERVICE_FOR.MEN, 'men');
            assert.equal(SERVICE_FOR.WOMEN, 'women');
            assert.equal(SERVICE_FOR.UNISEX, 'unisex');
        });

        it('User Identity Genders must be lowercase', () => {
            assert.equal(GENDER.MALE, 'male');
            assert.equal(GENDER.FEMALE, 'female');
            assert.equal(GENDER.TRANSGENDER, 'transgender');
        });
    });
});
