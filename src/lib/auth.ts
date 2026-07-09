import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'default_pzhr_secret_key_1234567890_super_secret';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionPayload {
  userId: string;
  role: string;
  expiresAt: number;
}

/**
 * Hash a password using Node's native scrypt algorithm.
 * Returns a string formatted as "salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verify a password against a stored "salt:hash" string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;

    const [salt, hash] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const originalHash = Buffer.from(hash, 'hex');

    return crypto.timingSafeEqual(derivedKey, originalHash);
  }

  if (storedHash.length === 64) {
    const staticSalt = 'mscdcl_pune_zone_salt_12345';
    const derivedKey = crypto.pbkdf2Sync(password, staticSalt, 100000, 32, 'sha256');
    const originalHash = Buffer.from(storedHash, 'hex');

    return crypto.timingSafeEqual(derivedKey, originalHash);
  }

  return false;
}

// Base64Url encode utility function
function base64urlEncode(str: string | Buffer): string {
  const base64 = Buffer.isBuffer(str) ? str.toString('base64') : Buffer.from(str).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Create a signed standard JWT token compatible with PyJWT.
 */
export function createSessionToken(userId: string, role: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // standard JWT exp is in seconds
  // The python backend expects 'sub' for the user ID.
  const payload = { sub: userId, role: role, exp: expiresAt };
  
  const headerStr = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const payloadStr = JSON.stringify(payload);
  
  const headerB64Url = base64urlEncode(headerStr);
  const payloadB64Url = base64urlEncode(payloadStr);
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64Url}.${payloadB64Url}`)
    .digest();
    
  const signatureB64Url = base64urlEncode(signature);
    
  return `${headerB64Url}.${payloadB64Url}.${signatureB64Url}`;
}

/**
 * Verify and decode a standard JWT token.
 */
export function verifySessionToken(token: string): any {
  if (!token) return null;
  
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [headerB64, payloadB64, signatureB64] = parts;
  
  // Re-verify the signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
    
  const expectedSignatureB64Url = base64urlEncode(expectedSignature);
    
  if (signatureB64 !== expectedSignatureB64Url) {
    return null;
  }
  
  try {
    const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    // Check expiration (in seconds)
    if (Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}
