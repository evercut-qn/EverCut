import { Router } from 'express';
import authRoutes from './auth.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import customerRoutes from './customer.routes.js';
import barberRoutes from './barber.routes.js';
import paymentRoutes from './payment.routes.js';
import payoutRoutes from './payout.routes.js';
import { ApiResponse } from '../utils/api-response.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/payments', paymentRoutes);
router.use('/payouts', payoutRoutes);
router.use('/customer', customerRoutes);
router.use('/barber', barberRoutes);

// Health check
router.get('/health', (_req, res) => {
    res.status(200).json(
        ApiResponse.success(
            { timestamp: new Date().toISOString() },
            'EverCut API is running',
        ),
    );
});

export default router;
