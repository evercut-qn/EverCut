import Notification, { NotificationRecipient, NotificationAuditLog } from '../models/notification.model.js';
import { NOTIFICATION_STATUS, NOTIFICATION_AUDIT_ACTION } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

export const runStartupRecoveryScan = async () => {
    try {
        const threshold = new Date(Date.now() - 5 * 60 * 1000); // Stuck for > 5 minutes
        const stuckBroadcasts = await Notification.find(trustQueryOperators({
            status: NOTIFICATION_STATUS.SENDING,
            sentAt: { $lt: threshold }
        }));

        if (stuckBroadcasts.length === 0) {
            logger.info('[StartupRecovery] No stuck broadcasts found');
            return;
        }

        logger.info(`[StartupRecovery] Found ${stuckBroadcasts.length} stuck broadcasts to recover`);

        for (const broadcast of stuckBroadcasts) {
            const totalRecipients = await NotificationRecipient.countDocuments({ notificationId: broadcast._id });
            const processedRecipients = await NotificationRecipient.countDocuments(trustQueryOperators({
                notificationId: broadcast._id,
                processedAt: { $ne: null }
            }));
            const remainingRecipients = totalRecipients - processedRecipients;

            let failureReason = '';
            if (totalRecipients > 0) {
                failureReason = `Server restarted during dispatch. Processed ${processedRecipients} of ${totalRecipients} recipients. ${remainingRecipients} remaining.`;
            } else {
                failureReason = 'Server restarted during dispatch before recipients were created.';
            }

            logger.warn(`[StartupRecovery] Recovering stuck broadcast`, {
                notificationId: broadcast._id,
                totalRecipients,
                processedRecipients,
                remainingRecipients
            });

            const updated = await Notification.findByIdAndUpdate(
                broadcast._id,
                {
                    $set: {
                        status: NOTIFICATION_STATUS.FAILED,
                        failureReason,
                        completedAt: new Date()
                    }
                },
                { new: true }
            );

            await NotificationAuditLog.create({
                action: NOTIFICATION_AUDIT_ACTION.DELIVERY_COMPLETED,
                resourceType: 'Notification',
                resourceId: broadcast._id,
                after: updated,
                metadata: {
                    recovery: true,
                    failureReason,
                    totalRecipients,
                    processedRecipients,
                    remainingRecipients
                }
            });
        }
    } catch (error) {
        logger.error('[StartupRecovery] Failed to run recovery scan', { error: error.message });
    }
};
