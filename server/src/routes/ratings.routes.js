import { Router } from 'express';

import * as ratingController from '../controllers/rating.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { objectIdParamSchema, paginationSchema } from '../validators/common.validator.js';
import { addRatingSchema, addReplySchema } from '../validators/rating.validator.js';
import { shopIdParamSchema } from '../validators/shop.validator.js';

const router = Router();

router.get('/shop/:id', validate(shopIdParamSchema, 'params'), validate(paginationSchema, 'query'), ratingController.getShopRatings);
router.get('/shop/:id/summary', validate(shopIdParamSchema, 'params'), ratingController.getShopRatingSummary);

router.use(authenticate);

router.get('/summary', authorize(ROLES.BARBER), ratingController.getOwnedRatingSummary);
router.get('/', authorize(ROLES.BARBER), validate(paginationSchema, 'query'), ratingController.getOwnedRatings);
router.post('/', authorize(ROLES.CUSTOMER), validate(addRatingSchema, 'body'), ratingController.addRating);
router.post('/:id/reply', authorize(ROLES.BARBER), validate(objectIdParamSchema, 'params'), validate(addReplySchema, 'body'), ratingController.addReply);
router.put('/:id/reply', authorize(ROLES.BARBER), validate(objectIdParamSchema, 'params'), validate(addReplySchema, 'body'), ratingController.updateReply);
router.delete('/:id/reply', authorize(ROLES.BARBER), validate(objectIdParamSchema, 'params'), ratingController.deleteReply);
router.delete('/:id', authorize(ROLES.BARBER), validate(objectIdParamSchema, 'params'), ratingController.deleteRating);

export default router;
