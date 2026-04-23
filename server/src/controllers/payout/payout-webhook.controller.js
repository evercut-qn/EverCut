import * as payoutService from '../../services/payout.service.js';
import logger from '../../utils/logger.js';

export const handlePayoutWebhook = async (req, res) => {
    try {
        const rawBody = req.rawBody || JSON.stringify(req.body || {});
        const result = await payoutService.handlePayoutWebhook(req.headers, rawBody, req.body);

        logger.info('[PayoutWebhookController] Webhook processed', {
            event: result.event,
            processed: result.processed,
        });

        return res.status(200).json({ received: true });
    } catch (error) {
        logger.error('[PayoutWebhookController] Webhook processing error', {
            error: error.message,
        });

        return res.status(200).json({ received: true, error: 'processing_error' });
    }
};
