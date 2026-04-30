import { Router } from 'express';

import * as earningsController from '../controllers/earnings.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authenticate, authorize(ROLES.BARBER));

router.get('/', earningsController.getEarnings);
router.get('/overview', earningsController.getDashboardOverview);

export default router;
