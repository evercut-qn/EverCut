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
 * Standardized fetch client wrapper for backend API operations.
 * Handles auth bearer insertion, timeout guards, and server error parsing.
 *
 * Token management architecture:
 * - Session refresh: handled strictly by proxy.js (Edge middleware)
 * - auth.js uses raw fetch to avoid circular imports and edge runtime issues
 *
 * @param {string} endpoint - API path relative to the Base URL (must start with /)
 * @param {Object} [options] - Standard Request Init configurations
 * @param {Object} [options.body] - Request body (will be automatically JSON stringified)
 * @param {string} [options.token] - Explicit JWT token to forward (required in Server Components)
 * @param {number} [options.timeout=10000] - Request timeout duration in milliseconds
 * @returns {Promise<{success: boolean, message: string, data?: any, errors?: Array<{field: string, message: string}>}>} Unified API response payload
 */
export async function apiFetch(endpoint, options = {}) {
  const { body, token, timeout = 10000, headers = {}, ...rest } = options;
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
      meta: payload.meta,
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
