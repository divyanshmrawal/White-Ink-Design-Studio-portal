import crypto from 'crypto';

/**
 * Derives a 32-byte Buffer key from the GOOGLE_TOKEN_ENCRYPTION_KEY environment variable.
 * Supports 64-char hex, 44-char base64, or arbitrary strings hashed via SHA-256.
 */
function getEncryptionKey(): Buffer {
  const rawKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!rawKey || rawKey.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL SECURITY ERROR: GOOGLE_TOKEN_ENCRYPTION_KEY is required in production for secure token storage.'
      );
    }
    // Development fallback key (SHA-256 of dev seed)
    return crypto.createHash('sha256').update('white-ink-dev-google-encryption-key-2026').digest();
  }

  // If provided as 64-char hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(rawKey.trim())) {
    return Buffer.from(rawKey.trim(), 'hex');
  }

  // Fallback: derive 32-byte key via SHA-256
  return crypto.createHash('sha256').update(rawKey.trim()).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: iv:authTag:encrypted (in hex)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Input format: iv:authTag:encrypted (in hex)
 */
export function decryptToken(cipherText: string): string | null {
  if (!cipherText || !cipherText.includes(':')) return null;

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt Google token. Key mismatch or corrupted data.');
    return null;
  }
}

/**
 * Sanitizes an error message by stripping all sensitive OAuth tokens, secrets, private keys, and internal stacks.
 */
export function sanitizeErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';
  const raw = typeof err === 'string' ? err : (err as any)?.message || String(err);

  // Strip tokens, secrets, private keys, authorization headers
  let sanitized = raw
    .replace(/(?:Bearer\s+|access_token=|refresh_token=|client_secret=|key=)[a-zA-Z0-9_\-\.~]+/gi, '[REDACTED]')
    .replace(/-----BEGIN[A-Z\s]+KEY-----[\s\S]*?-----END[A-Z\s]+KEY-----/g, '[REDACTED_KEY]')
    .replace(/\"(?:access_token|refresh_token|client_secret|private_key)\"\s*:\s*\"[^\"]+\"/gi, '"$1":"[REDACTED]"');

  // Convert common Google API error codes to human-readable explanations
  if (sanitized.includes('invalid_grant') || sanitized.includes('Token has been expired or revoked')) {
    return 'Google authorization has expired or was revoked. Please reconnect in Admin Settings.';
  }
  if (sanitized.includes('insufficientPermissions') || sanitized.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
    return 'Google account lacks required permissions. Please reconnect with required permissions.';
  }
  if (sanitized.includes('rateLimitExceeded') || sanitized.includes('User Rate Limit Exceeded')) {
    return 'Google API rate limit exceeded. Please wait a few moments and try again.';
  }
  if (sanitized.includes('notFound') || sanitized.includes('File not found')) {
    return 'Requested resource was not found in Google Workspace.';
  }

  // Return clean single-line error message capped to safe length
  return sanitized.split('\n')[0].slice(0, 200).trim();
}
