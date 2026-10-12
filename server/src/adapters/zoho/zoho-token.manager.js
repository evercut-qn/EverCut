import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { PaymentError } from '../../utils/api-error.js';

const safeReadJson = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

// Zoho access tokens are org-level and generated from a long-lived refresh
// token (see: https://www.zoho.com/in/payments/developerdocs/web-integration/org-oauth/
// "Generate Access Tokens from Refresh Tokens"). Unlike PhonePe, the
// refresh_token itself never expires (until revoked), so there is no
// separate "refresh the refresh token" step - we only ever exchange it for
// short-lived access tokens (~1 hour).
class ZohoTokenManager {
    constructor() {
        this._token = null;
        this._expiresAt = 0;
        this._refreshPromise = null;
        this._refreshBufferMs = config.zoho.tokenRefreshBufferMs;
    }

    async getToken() {
        if (this._isTokenValid()) {
            return this._token;
        }

        if (!this._refreshPromise) {
            this._refreshPromise = this._refreshToken();
        }

        try {
            await this._refreshPromise;
            return this._token;
        } finally {
            this._refreshPromise = null;
        }
    }

    async forceRefresh() {
        this._token = null;
        this._expiresAt = 0;
        return this.getToken();
    }

    _isTokenValid() {
        return Boolean(this._token) && Date.now() < (this._expiresAt - this._refreshBufferMs);
    }

    async _refreshToken() {
        const url = new URL(config.zoho.accountsTokenUrl);
        url.searchParams.set('refresh_token', config.zoho.refreshToken);
        url.searchParams.set('client_id', config.zoho.clientId);
        url.searchParams.set('client_secret', config.zoho.clientSecret);
        url.searchParams.set('grant_type', 'refresh_token');

        logger.info('[ZohoTokenManager] Refreshing access token', {
            environment: config.zoho.env,
        });

        const response = await fetch(url.toString(), { method: 'POST' });
        const data = await safeReadJson(response);

        if (!response.ok || !data?.access_token) {
            logger.error('[ZohoTokenManager] Token refresh failed', {
                status: response.status,
                error: data?.error || data?.message || response.statusText,
            });
            throw new PaymentError('Zoho token refresh failed');
        }

        this._token = data.access_token;
        // expires_in is in seconds (typically 3600).
        this._expiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;

        logger.info('[ZohoTokenManager] Token refreshed successfully', {
            expiresAt: new Date(this._expiresAt).toISOString(),
        });
    }
}

const tokenManager = new ZohoTokenManager();
export default tokenManager;
