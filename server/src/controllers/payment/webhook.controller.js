import * as paymentService from '../../services/payment.service.js';
import logger from '../../utils/logger.js';

export const handleWebhook = async (req, res) => {
    try {
        const result = await paymentService.handleWebhook(req.headers, req.body);

        logger.info('[PaymentWebhookController] Webhook processed', {
            event: result.event,
            processed: result.processed,
        });

        return res.status(200).json({ received: true });
    } catch (error) {
        logger.error('[PaymentWebhookController] Webhook processing error', {
            error: error.message,
        });

        return res.status(200).json({ received: true, error: 'processing_error' });
    }
};
