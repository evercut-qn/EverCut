import { Router } from 'express';

import * as customerController from '../controllers/customer.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { updateCustomerSchema } from '../validators/customer.validator.js';
import { mediaIdBodySchema } from '../validators/media.validator.js';

const router = Router();

// All customer routes require authentication and CUSTOMER role
router.use(authenticate, authorize(ROLES.CUSTOMER));

router.get('/me', customerController.getMe);
router.patch('/me', validate(updateCustomerSchema, 'body'), customerController.updateMe);

router.patch('/me/media/picture', validate(mediaIdBodySchema, 'body'), customerController.updateMyPicture);
router.delete('/me/media/picture', customerController.removeMyPicture);

export default router;
