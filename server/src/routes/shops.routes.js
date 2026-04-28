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
import { deleteBarberAccountSchema } from '../validators/account.validator.js';
import {
    nearbyShopsQuerySchema,
    searchShopsQuerySchema,
    shopAvailabilityQuerySchema,
    servicesByGenderQuerySchema,
    shopIdParamSchema,
    toggleStatusSchema,
    updateBusinessSchema,
    updatePinSchema,
    updateUpiDetailsSchema,
} from '../validators/shop.validator.js';

const router = Router();

router.get('/me', authenticate, authorize(ROLES.BARBER), shopController.getMyShop);
router.put('/me', authenticate, authorize(ROLES.BARBER), validate(updateBusinessSchema, 'body'), shopController.updateMyShop);
router.get('/me/upi', authenticate, authorize(ROLES.BARBER), shopController.getMyUpiDetails);
router.put('/me/upi', authenticate, authorize(ROLES.BARBER), validate(updateUpiDetailsSchema, 'body'), shopController.updateMyUpiDetails);
router.put('/me/pin', authenticate, authorize(ROLES.BARBER), validate(updatePinSchema, 'body'), shopController.updateMyPin);
router.put('/me/picture', authenticate, authorize(ROLES.BARBER), uploadBarberProfilePhoto, shopController.updateMyPicture);
router.put('/me/cover', authenticate, authorize(ROLES.BARBER), uploadShopCover, shopController.updateMyCover);
router.put('/me/status', authenticate, authorize(ROLES.BARBER), validate(toggleStatusSchema, 'body'), shopController.toggleMyStatus);
router.post('/me/sign-out-everywhere', authenticate, authorize(ROLES.BARBER), shopController.signOutEverywhere);
router.delete('/me', authenticate, authorize(ROLES.BARBER), validate(deleteBarberAccountSchema, 'body'), shopController.deleteMyShop);

router.get('/nearby/services', validate(servicesByGenderQuerySchema, 'query'), shopController.getNearbyServices);
router.get('/nearby', validate(nearbyShopsQuerySchema, 'query'), shopController.getNearbyShops);
router.get('/doorstep', shopController.getDoorstepShops);
router.get('/search', validate(searchShopsQuerySchema, 'query'), shopController.searchShops);
router.get('/:id/employees', validate(shopIdParamSchema, 'params'), shopController.getShopEmployees);
router.get('/:id/availability', authenticate, validate(shopIdParamSchema, 'params'), validate(shopAvailabilityQuerySchema, 'query'), shopController.getShopAvailability);
router.get('/:id', validate(shopIdParamSchema, 'params'), shopController.getShopById);

export default router;
