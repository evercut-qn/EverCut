import userRepository from '../../repositories/user.repository.js';
import { NOTIFICATION_AUDIENCE_MODE, ROLES } from '../../utils/constants.js';

const toIdString = (value) => String(value?._id || value || '');

const dedupeRecipients = (recipients) => {
    const seen = new Set();
    return recipients.filter((recipient) => {
        const key = toIdString(recipient.userId);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const recipientsFromUsers = (users) => dedupeRecipients(users.filter(Boolean).map((user) => ({
    userId: toIdString(user._id),
    roleType: user.roleType,
})));

const AUDIENCE_ROLES_MAP = {
    [NOTIFICATION_AUDIENCE_MODE.CUSTOMERS]: [ROLES.CUSTOMER],
    [NOTIFICATION_AUDIENCE_MODE.BARBERS]: [ROLES.BARBER],
    [NOTIFICATION_AUDIENCE_MODE.CUSTOMERS_AND_BARBERS]: [ROLES.CUSTOMER, ROLES.BARBER],
};

export const resolveAudience = async (audience = {}) => {
    const roles = AUDIENCE_ROLES_MAP[audience.mode];
    if (!roles) {
        throw new Error(`Unknown audience mode: ${audience.mode}`);
    }

    const recipients = recipientsFromUsers(await userRepository.findActiveByRoles(roles, audience.filters || {}));
    return {
        recipients,
        recipientCount: recipients.length,
        tokenCount: 0,
        sampleRecipients: recipients.slice(0, 5),
    };
};

const notificationAudienceService = {
    resolveAudience,
};

export default notificationAudienceService;
