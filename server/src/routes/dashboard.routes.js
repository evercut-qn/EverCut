import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// ============================================================================
// Authenticated Dashboard Routes (Barber Only)
// ============================================================================

router.use(authenticate);
router.use(authorize(ROLES.BARBER));

// Dashboard endpoints
router.get('/overview', dashboardController.getDashboardOverview);
router.get('/pulse', dashboardController.getTodaysPulse);
router.get('/staff', dashboardController.getStaffAvailability);
router.get('/queue', dashboardController.getTodaysQueue);

export default router;
