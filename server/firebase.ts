import { initializeApp, getApps, cert, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getMessaging, Message, Messaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

export interface FirebaseConfigData {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  vapidKey?: string;
  clientEmail?: string;
  privateKey?: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'firebase-runtime-config.json');

let messagingClient: Messaging | null = null;
let initAttempted = false;

/**
 * Load runtime Firebase configuration from disk or fallback to process.env
 */
export function getStoredFirebaseConfig(): FirebaseConfigData {
  let fileConfig: FirebaseConfigData = {};
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      fileConfig = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[FCM Config] Could not read firebase-runtime-config.json:', e);
  }

  return {
    apiKey: fileConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    authDomain: fileConfig.authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: fileConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: fileConfig.storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId:
      fileConfig.messagingSenderId ||
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      process.env.FIREBASE_MESSAGING_SENDER_ID ||
      '',
    appId: fileConfig.appId || process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
    vapidKey: fileConfig.vapidKey || process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || '',
    clientEmail: fileConfig.clientEmail || process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: fileConfig.privateKey || process.env.FIREBASE_PRIVATE_KEY || '',
  };
}

/**
 * Save updated Firebase credentials from in-app admin form
 */
export async function saveStoredFirebaseConfig(updates: Partial<FirebaseConfigData>): Promise<FirebaseConfigData> {
  const current = getStoredFirebaseConfig();
  const merged: FirebaseConfigData = {
    apiKey: updates.apiKey !== undefined ? updates.apiKey.trim() : current.apiKey,
    authDomain: updates.authDomain !== undefined ? updates.authDomain.trim() : current.authDomain,
    projectId: updates.projectId !== undefined ? updates.projectId.trim() : current.projectId,
    storageBucket: updates.storageBucket !== undefined ? updates.storageBucket.trim() : current.storageBucket,
    messagingSenderId: updates.messagingSenderId !== undefined ? updates.messagingSenderId.trim() : current.messagingSenderId,
    appId: updates.appId !== undefined ? updates.appId.trim() : current.appId,
    vapidKey: updates.vapidKey !== undefined ? updates.vapidKey.trim() : current.vapidKey,
    clientEmail: updates.clientEmail !== undefined ? updates.clientEmail.trim() : current.clientEmail,
    privateKey: updates.privateKey !== undefined ? updates.privateKey.trim() : current.privateKey,
  };

  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    console.log('[FCM Config] Configuration saved to firebase-runtime-config.json');
  } catch (err) {
    console.error('[FCM Config] Failed to write firebase-runtime-config.json:', err);
  }

  // Reset current client and reinitialize
  await resetFirebaseMessaging();
  return merged;
}

/**
 * Clear stored Firebase credentials
 */
export async function clearStoredFirebaseConfig(): Promise<void> {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      fs.unlinkSync(CONFIG_FILE_PATH);
    }
  } catch (err) {
    console.warn('[FCM Config] Could not delete config file:', err);
  }

  await resetFirebaseMessaging();
}

/**
 * Reset and teardown current Firebase Admin SDK app instances
 */
export async function resetFirebaseMessaging(): Promise<void> {
  messagingClient = null;
  initAttempted = false;

  const existingApps = getApps();
  for (const app of existingApps) {
    try {
      await deleteApp(app);
    } catch (e) {
      // Ignore cleanup error
    }
  }
}

/**
 * Checks whether an error from Firebase indicates that the device registration token
 * is invalid, expired, or unregistered.
 */
export function isInvalidFcmTokenError(errorCodeOrMessage: string): boolean {
  if (!errorCodeOrMessage) return false;
  const lower = errorCodeOrMessage.toLowerCase();
  return (
    lower.includes('registration-token-not-registered') ||
    lower.includes('invalid-registration-token') ||
    lower.includes('invalid-argument') ||
    lower.includes('notregistered') ||
    lower.includes('invalidregistration') ||
    lower.includes('unregistered') ||
    lower.includes('mismatched-credential')
  );
}

/**
 * Returns Firebase Cloud Messaging client using lazy initialization.
 */
export function getFirebaseMessaging(): Messaging | null {
  if (messagingClient) {
    return messagingClient;
  }

  if (initAttempted && !messagingClient) {
    return null;
  }

  initAttempted = true;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      messagingClient = getMessaging(existingApps[0]);
      return messagingClient;
    }

    const cfg = getStoredFirebaseConfig();
    const projectId = cfg.projectId;
    const clientEmail = cfg.clientEmail;
    let privateKey = cfg.privateKey;

    if (projectId && clientEmail && privateKey) {
      // Normalize escaped newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });

      messagingClient = getMessaging(app);
      console.log(`[FCM Admin] Successfully initialized Firebase Admin for project: ${projectId}`);
      return messagingClient;
    }

    // Optional: Fallback to FIREBASE_SERVICE_ACCOUNT_KEY if provided
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      let parsedCreds: any;
      try {
        parsedCreds = JSON.parse(serviceAccountKey);
      } catch {
        const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
        parsedCreds = JSON.parse(decoded);
      }

      const app = initializeApp({
        credential: cert(parsedCreds),
        projectId: parsedCreds.project_id || projectId,
      });

      messagingClient = getMessaging(app);
      console.log('[FCM Admin] Initialized with FIREBASE_SERVICE_ACCOUNT_KEY.');
      return messagingClient;
    }

    // Fallback: GCP Application Default Credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const app = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      messagingClient = getMessaging(app);
      console.log('[FCM Admin] Initialized with applicationDefault credentials.');
      return messagingClient;
    }

    console.info(
      '[FCM Admin] Backend credentials (projectId, clientEmail, privateKey) not configured yet. Fill the Firebase Credentials form in Admin Settings to activate FCM push.'
    );
    return null;
  } catch (err: any) {
    console.error('[FCM Admin] Error during Firebase Admin initialization:', err?.message || err);
    return null;
  }
}

/**
 * Send FCM push notification to a device token using Firebase Admin SDK.
 */
export async function sendFcmPushNotification(
  token: string,
  payload: {
    title: string;
    body: string;
    linkUrl?: string;
    data?: Record<string, string>;
  }
): Promise<{ success: boolean; error?: string; isInvalidToken?: boolean }> {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'No token provided' };
  }

  const link = payload.linkUrl || '/';
  const messaging = getFirebaseMessaging();

  if (!messaging) {
    return {
      success: false,
      error: 'Firebase Admin SDK not configured. Please enter Firebase credentials in Admin Settings.',
    };
  }

  try {
    const message: Message = {
      token: token.trim(),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...(payload.data || {}),
        title: payload.title,
        body: payload.body,
        linkUrl: link,
      },
      webpush: {
        fcmOptions: {
          link,
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`[FCM Admin] Push notification dispatched successfully. Message ID: ${response}`);
    return { success: true };
  } catch (err: any) {
    const errorCode = err?.code || err?.message || 'UNKNOWN_FCM_ERROR';
    const isInvalidToken = isInvalidFcmTokenError(errorCode);

    console.warn(`[FCM Admin] Push dispatch failed: ${errorCode}. isInvalidToken: ${isInvalidToken}`);
    return {
      success: false,
      error: errorCode,
      isInvalidToken,
    };
  }
}
