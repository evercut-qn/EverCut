/**
 * Decodes the payload segment of a JWT token.
 * Safe for Edge, Node, and browser environments. Supports UTF-8 and base64url.
 * 
 * @param {string} token - The raw JWT token string
 * @returns {Object|null} Parsed payload object or null if invalid
 */
export function decodeJWTPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder('utf-8').decode(bytes));
  } catch {
    return null;
  }
}
