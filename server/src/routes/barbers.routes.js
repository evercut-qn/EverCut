import { Router } from 'express';

import * as shopController from '../controllers/shop.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { barberDirectoryQuerySchema } from '../validators/barber.validator.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', validate(barberDirectoryQuerySchema, 'query'), shopController.listBarbers);

export default router;
