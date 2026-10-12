import { Router } from 'express';

import * as customerController from '../controllers/customer.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { updateCustomerSchema, customerIdParamSchema } from '../validators/customer.validator.js';
import { mediaIdBodySchema } from '../validators/media.validator.js';
import { customerDirectoryQuerySchema } from '../validators/user.validator.js';

const router = Router();

router.use(authenticate);

router.get('/me', authorize(ROLES.CUSTOMER), customerController.getMe);
router.patch('/me', authorize(ROLES.CUSTOMER), validate(updateCustomerSchema, 'body'), customerController.updateMe);

router.patch('/me/media/picture', authorize(ROLES.CUSTOMER), validate(mediaIdBodySchema, 'body'), customerController.updateMyPicture);
router.delete('/me/media/picture', authorize(ROLES.CUSTOMER), customerController.removeMyPicture);

router.delete('/me', authorize(ROLES.CUSTOMER), customerController.deleteMe);

router.get(
    '/',
    authorize(ROLES.ADMIN),
    validate(customerDirectoryQuerySchema, 'query'),
    customerController.listCustomers,
);

router.get(
    '/:id',
    authorize(ROLES.ADMIN),
    validate(customerIdParamSchema, 'params'),
    customerController.getCustomerById,
);

export default router;
