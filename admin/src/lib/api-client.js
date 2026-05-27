const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Custom application-level error class representing an API issue.
 */
export class APIError extends Error {
  /**
   * @param {string} message - User-friendly explanation
   * @param {number} status - HTTP status code
   * @param {Object} [data] - Parsed server response data (e.g. fields validation errors)
   */
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Clears the admin session cookies on the client side and redirects to login.
 * Only runs in browser context.
 */
function clearSessionAndRedirect() {
  document.cookie = 'evercut_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'evercut_admin_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
}

/**
 * Attempts a silent token refresh using the refresh token cookie on the client side.
 * Only runs in browser context.
 *
 * NOTE: auth.js (getValidAccessToken / refreshTokens) handles server-side refresh.
 * This handles the client-side equivalent for 401 responses from the API client.
 *
 * @returns {Promise<string|null>} New access token or null if refresh failed
 */
async function tryClientSideRefresh() {
  // Read the refresh token from the cookie (it is httpOnly, so this will be empty
  // in production — client-side refresh is only possible if the cookie is not httpOnly,
  // or if a dedicated client-facing refresh endpoint exists).
  // The primary refresh path is the edge middleware (proxy.js).
  // This is a best-effort fallback for in-page 401s.
  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh`, {
      method: 'POST',
      credentials: 'include', // sends the httpOnly refresh token cookie automatically
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // No body needed — the backend reads the refresh token from cookies if configured,
      // OR the proxy middleware will have already refreshed before the request reached here.
      body: JSON.stringify({}),
    });

    if (!res.ok) return null;
    const payload = await res.json();
    return payload.data?.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Standardized fetch client wrapper for backend API operations.
 * Handles auth bearer insertion, timeout guards, 401 token refresh, and server error parsing.
 *
 * Token management architecture:
 * - Server-side refresh: handled by proxy.js (Edge middleware) via auth.js
 * - Client-side refresh: attempted here on 401, before falling back to login redirect
 * - auth.js uses raw fetch (not this client) to avoid circular imports and edge runtime issues
 *
 * @param {string} endpoint - API path relative to the Base URL (must start with /)
 * @param {Object} [options] - Standard Request Init configurations
 * @param {Object} [options.body] - Request body (will be automatically JSON stringified)
 * @param {string} [options.token] - Explicit JWT token to forward (required in Server Components)
 * @param {number} [options.timeout=10000] - Request timeout duration in milliseconds
 * @param {boolean} [options._isRetry=false] - Internal flag to prevent infinite refresh loops
 * @returns {Promise<{success: boolean, message: string, data?: any, errors?: Array<{field: string, message: string}>}>} Unified API response payload
 */
export async function apiFetch(endpoint, options = {}) {
  const { body, token, timeout = 10000, headers = {}, _isRetry = false, ...rest } = options;
  const url = `${BASE_URL}${endpoint}`;

  // 1. Setup headers configuration
  const configHeaders = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  });

  // 2. Resolve authentication token
  let resolvedToken = token;
  if (!resolvedToken && typeof window !== 'undefined') {
    // Resolve token from document cookies on the client side
    const matches = document.cookie.match(/(?:^|; )evercut_admin_session=([^;]*)/);
    resolvedToken = matches ? decodeURIComponent(matches[1]) : undefined;
  }

  if (resolvedToken) {
    configHeaders.set('Authorization', `Bearer ${resolvedToken}`);
  }

  // 3. Setup timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchOptions = {
    method: 'GET',
    headers: configHeaders,
    signal: controller.signal,
    ...rest,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // 4. Handle token expiry (401 Unauthorized) — client-side only
    if (response.status === 401 && typeof window !== 'undefined') {
      if (!_isRetry) {
        // Attempt one silent refresh before giving up.
        // Server-side refresh is handled by proxy.js middleware on every page navigation.
        // This handles in-page API calls after a token expires mid-session.
        const newToken = await tryClientSideRefresh();
        if (newToken) {
          // Retry the original request with the new token
          return apiFetch(endpoint, { ...options, token: newToken, _isRetry: true });
        }
      }
      // Refresh failed or already retried — clear and redirect
      clearSessionAndRedirect();
      return { success: false, message: 'Session expired. Please log in again.' };
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new APIError(
        payload.message || `API Request failed with status ${response.status}`,
        response.status,
        payload.data
      );
    }

    return {
      success: true,
      message: payload.message || 'Request completed successfully',
      data: payload.data,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. Please check your connection and try again.',
      };
    }

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        errors: error.data?.errors,
        data: error.data,
      };
    }

    return {
      success: false,
      message: error.message || 'A network error occurred. Please verify connectivity.',
    };
  }
}
