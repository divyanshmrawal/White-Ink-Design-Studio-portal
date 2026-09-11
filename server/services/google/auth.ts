import crypto from 'crypto';
import { google } from 'googleapis';
import { db } from '../../db.ts';
import { encryptToken, decryptToken, sanitizeErrorMessage } from './crypto.ts';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
];

interface OAuthStateRecord {
  state: string;
  userId: string;
  expiresAt: number;
}

// In-memory single-use state store with automatic TTL cleanup
const oauthStateStore = new Map<string, OAuthStateRecord>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generates and temporarily stores a cryptographically secure random state token tied to the super admin.
 */
export function generateOAuthState(userId: string): string {
  const now = Date.now();
  // Prune expired states
  for (const [key, record] of oauthStateStore.entries()) {
    if (record.expiresAt < now) {
      oauthStateStore.delete(key);
    }
  }

  const state = crypto.randomBytes(32).toString('hex');
  oauthStateStore.set(state, {
    state,
    userId,
    expiresAt: now + STATE_TTL_MS,
  });

  return state;
}

/**
 * Validates and consumes an OAuth state token.
 * Immediately deletes the state upon validation to guarantee single-use and prevent replay attacks.
 */
export function validateAndConsumeOAuthState(state: string | null | undefined): {
  valid: boolean;
  userId?: string;
  error?: string;
} {
  if (!state || typeof state !== 'string' || state.trim() === '') {
    return { valid: false, error: 'OAuth state parameter is missing.' };
  }

  const cleanState = state.trim();
  const record = oauthStateStore.get(cleanState);
  if (!record) {
    return { valid: false, error: 'Invalid or already used OAuth state.' };
  }

  // Delete immediately to prevent replay attacks
  oauthStateStore.delete(cleanState);

  if (record.expiresAt < Date.now()) {
    return { valid: false, error: 'OAuth state has expired. Please try connecting again.' };
  }

  return { valid: true, userId: record.userId };
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth 2.0 authorization URL for the Super Admin.
 * Requests offline access, forces consent prompt, and binds a secure state token.
 */
export function getGoogleAuthUrl(userId?: string): string {
  const oauth2Client = getOAuth2Client();
  const state = generateOAuthState(userId || 'super-admin');

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
    state,
  });
}

/**
 * Exchanges the authorization code received from Google for tokens.
 * Validates the state parameter, encrypts the refresh token, and persists the singleton integration in the database.
 */
export async function handleOAuthCallback(code: string, state?: string): Promise<{ success: boolean; email?: string; error?: string }> {
  // Validate state token to protect against CSRF & replay attacks
  const stateValidation = validateAndConsumeOAuthState(state);
  if (!stateValidation.valid) {
    return {
      success: false,
      error: stateValidation.error || 'Invalid or expired OAuth state.',
    };
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch connected email address using oauth2 userinfo
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || 'connected-account';

    const existing = db.getGoogleIntegration();

    // If Google did not return a refresh token (e.g. re-auth without consent prompt), preserve existing
    let encryptedRefreshToken = existing?.encryptedRefreshToken || null;
    if (tokens.refresh_token) {
      encryptedRefreshToken = encryptToken(tokens.refresh_token);
    }

    if (!encryptedRefreshToken) {
      return {
        success: false,
        error: 'No refresh token was returned by Google. Please reconnect with consent prompt.',
      };
    }

    db.updateGoogleIntegration({
      isConnected: true,
      connectedEmail: email,
      encryptedRefreshToken,
      accessToken: tokens.access_token || null,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scopes: tokens.scope || GOOGLE_SCOPES.join(' '),
      lastSyncAt: new Date().toISOString(),
    });

    return { success: true, email };
  } catch (err: any) {
    console.error('Google OAuth callback error:', err?.message || err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

export type AuthenticatedClientResult = {
  success: boolean;
  oauth2Client?: InstanceType<typeof google.auth.OAuth2>;
  error?: string;
  message?: string;
};

/**
 * Retrieves an authenticated Google OAuth2 client for the singleton Super Admin integration.
 * Automatically refreshes access tokens when needed and updates the database cache.
 */
export async function getAuthenticatedClient(): Promise<AuthenticatedClientResult> {
  const integration = db.getGoogleIntegration();

  if (!integration || !integration.isConnected || !integration.encryptedRefreshToken) {
    return {
      success: false,
      error: 'GOOGLE_NOT_CONNECTED',
      message: 'Google integration is not connected. Connect your Google account in Admin Settings.',
    };
  }

  const refreshToken = decryptToken(integration.encryptedRefreshToken);
  if (!refreshToken) {
    db.updateGoogleIntegration({ isConnected: false });
    return {
      success: false,
      error: 'GOOGLE_TOKEN_REVOKED',
      message: 'Stored Google token could not be decrypted. Please reconnect in Admin Settings.',
    };
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: integration.accessToken || undefined,
    expiry_date: integration.tokenExpiry ? new Date(integration.tokenExpiry).getTime() : undefined,
  });

  // Listen for automatic token refreshes by the client to update DB cache
  oauth2Client.on('tokens', (tokens) => {
    const updates: any = {
      lastSyncAt: new Date().toISOString(),
    };
    if (tokens.access_token) {
      updates.accessToken = tokens.access_token;
    }
    if (tokens.expiry_date) {
      updates.tokenExpiry = new Date(tokens.expiry_date).toISOString();
    }
    if (tokens.refresh_token) {
      updates.encryptedRefreshToken = encryptToken(tokens.refresh_token);
    }
    db.updateGoogleIntegration(updates);
  });

  // Test credentials validity proactively if token is expired
  try {
    await oauth2Client.getAccessToken();
    return { success: true, oauth2Client };
  } catch (err: any) {
    console.error('Google token refresh failed:', err?.message || err);
    if (err?.message?.includes('invalid_grant') || err?.code === 400 || err?.code === 401) {
      db.updateGoogleIntegration({ isConnected: false });
      return {
        success: false,
        error: 'GOOGLE_TOKEN_REVOKED',
        message: 'Google authorization has expired or been revoked. Please reconnect in Admin Settings.',
      };
    }
    return {
      success: false,
      error: 'GOOGLE_NOT_CONNECTED',
      message: 'Unable to refresh Google access token. Please check Google connection.',
    };
  }
}

/**
 * Revokes authorization and clears the stored Google tokens.
 */
export async function disconnectGoogle(): Promise<{ success: boolean; message: string }> {
  try {
    const integration = db.getGoogleIntegration();
    if (integration.encryptedRefreshToken) {
      const refreshToken = decryptToken(integration.encryptedRefreshToken);
      if (refreshToken) {
        const oauth2Client = getOAuth2Client();
        await oauth2Client.revokeToken(refreshToken).catch(() => {});
      }
    }
  } catch (e) {
    // Ignore revoke errors
  }

  db.updateGoogleIntegration({
    isConnected: false,
    connectedEmail: null,
    encryptedRefreshToken: null,
    accessToken: null,
    tokenExpiry: null,
    scopes: null,
    lastSyncAt: new Date().toISOString(),
  });

  return { success: true, message: 'Google account disconnected successfully.' };
}

/**
 * Returns safe Google integration status for frontend consumption.
 * Never includes refresh tokens, access tokens, or client secrets.
 */
export function getSafeGoogleStatus() {
  const integration = db.getGoogleIntegration();
  const email = integration?.connectedEmail || null;
  return {
    isConnected: Boolean(integration?.isConnected),
    email,
    connectedEmail: email,
    driveRootFolderId: integration?.driveRootFolderId || null,
    sheetsAttendanceSpreadsheetId: integration?.sheetsAttendanceSpreadsheetId || null,
    sheetsAttendanceSheetName: integration?.sheetsAttendanceSheetName || 'Attendance_Log',
    calendarId: integration?.calendarId || 'primary',
    scopes: integration?.scopes ? integration.scopes.split(' ') : GOOGLE_SCOPES,
    lastSyncAt: integration?.lastSyncAt || null,
    updatedAt: integration?.updatedAt || null,
    error: null,
  };
}
