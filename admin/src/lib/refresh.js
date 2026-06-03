/**
 * Hits the backend API to exchange a refresh token for new tokens.
 * Safe to import inside Next.js Edge Middleware.
 * 
 * @param {string} refreshToken - The active refresh token string
 * @returns {Promise<Object|null>} New tokens object or null on failure
 */
export async function refreshTokens(refreshToken) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const res = await fetch(`${apiUrl}/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;
    const payload = await res.json();
    return payload.data;
  } catch {
    return null;
  }
}
