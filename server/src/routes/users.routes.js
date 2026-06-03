import { Router } from 'express';

import * as userController from '../controllers/user.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/summary', userController.getUserSummary);

export default router;
