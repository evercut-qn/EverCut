import { Router } from 'express';

import * as customerController from '../controllers/customer.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { uploadCustomerPhoto } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { updateCustomerSchema } from '../validators/customer.validator.js';

const router = Router();

router.use(authenticate, authorize(ROLES.CUSTOMER));

router.get('/me', customerController.getMe);
router.put('/me', uploadCustomerPhoto, validate(updateCustomerSchema, 'body'), customerController.updateMe);
router.get('/me/home', customerController.getMyHome);

export default router;
