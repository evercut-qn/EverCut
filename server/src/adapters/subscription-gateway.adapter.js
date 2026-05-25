export class SubscriptionGatewayAdapter {
    getProviderName() {
        throw new Error('getProviderName() must be implemented');
    }

    getPublicKeyId() {
        throw new Error('getPublicKeyId() must be implemented');
    }

    async createCustomer(_params) {
        throw new Error('createCustomer() must be implemented');
    }

    async createSubscription(_params) {
        throw new Error('createSubscription() must be implemented');
    }

    async updateSubscription(_subscriptionId, _params) {
        throw new Error('updateSubscription() must be implemented');
    }

    async cancelSubscription(_subscriptionId, _params) {
        throw new Error('cancelSubscription() must be implemented');
    }

    async fetchSubscription(_subscriptionId) {
        throw new Error('fetchSubscription() must be implemented');
    }

    async fetchPlans(_params) {
        throw new Error('fetchPlans() must be implemented');
    }

    verifyWebhook(_headers, _rawBody) {
        throw new Error('verifyWebhook() must be implemented');
    }
}
