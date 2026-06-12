import Notification, {
    NotificationAuditLog,
    InboxNotification,
    NotificationRecipient,
} from '../models/notification.model.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';
import { NOTIFICATION_STATUS } from '../utils/constants.js';

class NotificationRepository {
    async createInboxNotification(data) {
        return InboxNotification.create(data);
    }

    async createInboxNotificationIfNotExists(data) {
        try {
            const notification = await InboxNotification.create(data);
            return { created: true, notification };
        } catch (error) {
            if (error?.code === 11000 && data.dedupeKey) {
                const notification = await InboxNotification.findOne({ dedupeKey: data.dedupeKey });
                return { created: false, notification };
            }

            throw error;
        }
    }

    async findInboxNotificationByIdAndUser(id, userId) {
        return InboxNotification.findOne(trustQueryOperators({
            _id: id,
            recipientUserId: userId,
        })).lean();
    }

    async listInboxNotifications(userId, filter = {}, options = {}) {
        const query = InboxNotification.find(trustQueryOperators({
            recipientUserId: userId,
            ...filter,
        })).sort({ createdAt: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countInboxNotifications(userId, filter = {}) {
        return InboxNotification.countDocuments(trustQueryOperators({
            recipientUserId: userId,
            ...filter,
        }));
    }

    async countUnreadInboxNotifications(userId) {
        return InboxNotification.countDocuments(trustQueryOperators({
            recipientUserId: userId,
            readAt: null,
        }));
    }

    async markInboxNotificationRead(userId, notificationId) {
        return InboxNotification.findOneAndUpdate(
            trustQueryOperators({
                _id: notificationId,
                recipientUserId: userId,
            }),
            {
                $set: {
                    readAt: new Date(),
                },
            },
            { returnDocument: 'after' },
        );
    }

    async markAllInboxNotificationsRead(userId) {
        return InboxNotification.updateMany(
            trustQueryOperators({
                recipientUserId: userId,
                readAt: null,
            }),
            {
                $set: {
                    readAt: new Date(),
                },
            },
        );
    }

    async updateDeliveryStatus(id, updates) {
        return InboxNotification.findByIdAndUpdate(
            id,
            { $set: updates },
            { returnDocument: 'after' },
        );
    }

    async bulkCreateInboxNotifications(notifications = []) {
        if (!notifications.length) return [];
        return InboxNotification.insertMany(notifications, { ordered: false });
    }

    async listInboxNotificationsByBroadcastId(notificationId, options = {}) {
        const query = InboxNotification.find({ notificationId }).sort({ createdAt: -1 });
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countInboxNotificationsByBroadcastId(notificationId) {
        return InboxNotification.countDocuments({ notificationId });
    }

    async createNotification(data) {
        return Notification.create(data);
    }

    async findNotificationById(id) {
        return Notification.findById(id);
    }

    async getDerivedCampaignMetrics(notificationId) {
        const mongoose = (await import('mongoose')).default;
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return { deliveredUsers: 0, failedUsers: 0, offlineUsers: 0 };
        }
        const stats = await NotificationRecipient.aggregate([
            { $match: { notificationId: new mongoose.Types.ObjectId(notificationId) } },
            {
                $group: {
                    _id: null,
                    deliveredUsers: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ['$successCount', 0] },
                                        { $eq: ['$skippedReason', null] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    failedUsers: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$successCount', 0] },
                                        { $gt: ['$tokenCount', 0] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    offlineUsers: {
                        $sum: {
                            $cond: [
                                { $ne: ['$skippedReason', null] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        return stats[0] || { deliveredUsers: 0, failedUsers: 0, offlineUsers: 0 };
    }

    async listNotifications(filter = {}, options = {}) {
        const query = Notification.find(trustQueryOperators(filter)).sort({ createdAt: -1 });
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countNotifications(filter = {}) {
        return Notification.countDocuments(trustQueryOperators(filter));
    }

    async updateNotificationById(id, updates) {
        return Notification.findByIdAndUpdate(
            id,
            { $set: updates },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async claimNotificationForSending(id, sentByUserId = null) {
        return Notification.findOneAndUpdate(
            trustQueryOperators({
                _id: id,
                status: NOTIFICATION_STATUS.SENDING,
            }),
            {
                $set: {
                    sentByUserId,
                    sentAt: new Date(),
                },
            },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async bulkCreateRecipients(recipients = []) {
        if (!recipients.length) return [];
        return NotificationRecipient.insertMany(recipients, { ordered: false });
    }

    async listRecipientsByNotification(notificationId, filter = {}, options = {}) {
        const query = NotificationRecipient.find(trustQueryOperators({
            notificationId,
            ...filter,
        })).sort({ createdAt: -1 });
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countRecipientsByNotification(notificationId, filter = {}) {
        return NotificationRecipient.countDocuments(trustQueryOperators({
            notificationId,
            ...filter,
        }));
    }

    async updateRecipientById(id, updates) {
        return NotificationRecipient.findByIdAndUpdate(
            id,
            { $set: updates },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async createAuditLog(data) {
        return NotificationAuditLog.create(data);
    }

    async listAuditLogsByResource(resourceType, resourceId, options = {}) {
        const query = NotificationAuditLog.find({ resourceType, resourceId }).sort({ createdAt: -1 });
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }
}

export default new NotificationRepository();
