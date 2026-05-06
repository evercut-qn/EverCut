import { Router } from 'express';

import * as shopController from '../controllers/shop.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import {
    uploadBarberProfilePhoto,
    uploadShopCover,
} from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { paginationSchema } from '../validators/common.validator.js';
import {
    shopListQuerySchema,
    shopAvailabilityQuerySchema,
    servicesByGenderQuerySchema,
    shopIdParamSchema,
    toggleStatusSchema,
    updateBusinessSchema,
    updatePinSchema,
    updatePayoutDetailsSchema,
} from '../validators/shop.validator.js';

const router = Router();

router.get('/', validate(shopListQuerySchema, 'query'), shopController.getShops);
router.get('/services', validate(servicesByGenderQuerySchema, 'query'), shopController.getNearbyServices);
router.get('/favorites', authenticate, authorize(ROLES.CUSTOMER), validate(paginationSchema, 'query'), shopController.getFavoriteShops);
router.get('/me', authenticate, authorize(ROLES.BARBER), shopController.getMyShop);
router.patch('/me', authenticate, authorize(ROLES.BARBER), validate(updateBusinessSchema, 'body'), shopController.updateMyShop);
router.get('/me/payout-details', authenticate, authorize(ROLES.BARBER), shopController.getPayoutDetails);
router.patch('/me/payout-details', authenticate, authorize(ROLES.BARBER), validate(updatePayoutDetailsSchema, 'body'), shopController.updatePayoutDetails);
router.patch('/me/pin', authenticate, authorize(ROLES.BARBER), validate(updatePinSchema, 'body'), shopController.updateMyPin);
router.patch('/me/picture', authenticate, authorize(ROLES.BARBER), uploadBarberProfilePhoto, shopController.updateMyPicture);
router.patch('/me/cover', authenticate, authorize(ROLES.BARBER), uploadShopCover, shopController.updateMyCover);
router.patch('/me/status', authenticate, authorize(ROLES.BARBER), validate(toggleStatusSchema, 'body'), shopController.toggleMyStatus);
router.get('/:id/employees', validate(shopIdParamSchema, 'params'), shopController.getShopEmployees);
router.get('/:id/availability', authenticate, validate(shopIdParamSchema, 'params'), validate(shopAvailabilityQuerySchema, 'query'), shopController.getShopAvailability);
router.put('/:id/favorite', authenticate, authorize(ROLES.CUSTOMER), validate(shopIdParamSchema, 'params'), shopController.addFavoriteShop);
router.delete('/:id/favorite', authenticate, authorize(ROLES.CUSTOMER), validate(shopIdParamSchema, 'params'), shopController.removeFavoriteShop);
router.get('/:id', validate(shopIdParamSchema, 'params'), shopController.getShopById);

export default router;
