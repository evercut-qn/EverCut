import logger from '../utils/logger.js';
import { BadRequestError, NotFoundError } from '../utils/api-error.js';
import { verifyPin } from './pin.service.js';
import { revokeRefreshToken } from './auth.service.js';
import barberRepository from '../repositories/barber.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import userRepository from '../repositories/user.repository.js';

export const signOutEverywhere = async (userId) => {
    await revokeRefreshToken(userId);

    return {
        revokedAt: new Date().toISOString(),
    };
};

export const deleteBarberAccount = async (authUser, currentPin) => {
    const barber = await barberRepository.findByUserId(authUser._id);
    if (!barber) throw new NotFoundError('Barber profile');
    const shop = await shopRepository.findByBarberId(barber._id);
    if (!shop) throw new NotFoundError('Shop profile');

    const isPinValid = await verifyPin(barber.pinHash, currentPin);
    if (!isPinValid) throw new BadRequestError('Current PIN is incorrect');

    const deletedAt = new Date();
    let shopSoftDeleted = false;

    try {
        await shopRepository.updateByBarberId(barber._id, { deletedAt, isOpen: false });
        shopSoftDeleted = true;
        await barberRepository.softDelete(barber._id);

        // Revoke refresh access before the soft delete so the token hash can still be updated.
        await revokeRefreshToken(authUser._id);
        await userRepository.softDelete(authUser._id);
    } catch (err) {
        if (shopSoftDeleted) {
            try {
                await shopRepository.updateById(shop._id, { deletedAt: null, isOpen: shop.isOpen });
                await barberRepository.updateById(barber._id, { deletedAt: null });
            } catch (rollbackError) {
                logger.error('Failed to rollback shop soft delete', {
                    shopId: shop._id,
                    error: rollbackError.message,
                });
            }
        }
        throw err;
    }

    return {
        deleted: true,
        authCleanup: 'revoked',
    };
};
