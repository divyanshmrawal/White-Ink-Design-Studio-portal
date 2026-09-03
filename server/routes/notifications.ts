import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';
import {
  sendFcmPushNotification,
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  getFirebaseMessaging,
} from '../firebase.ts';

export const notificationsRouter = Router();

// GET /api/notifications/fcm-config - Public FCM configuration for client & service worker
notificationsRouter.get('/fcm-config', (req, res) => {
  const cfg = getStoredFirebaseConfig();

  const publicConfig = {
    apiKey: cfg.apiKey || '',
    authDomain: cfg.authDomain || '',
    projectId: cfg.projectId || '',
    storageBucket: cfg.storageBucket || '',
    messagingSenderId: cfg.messagingSenderId || '',
    appId: cfg.appId || '',
    vapidKey: cfg.vapidKey || '',
  };

  const configured = Boolean(publicConfig.apiKey && publicConfig.projectId && publicConfig.messagingSenderId);
  const hasAdminCredentials = Boolean(cfg.projectId && cfg.clientEmail && cfg.privateKey);

  return res.json({
    configured,
    hasAdminCredentials,
    config: publicConfig,
    adminConfig: {
      projectId: cfg.projectId || '',
      clientEmail: cfg.clientEmail || '',
      hasPrivateKey: Boolean(cfg.privateKey),
    },
  });
});

// POST /api/notifications/fcm-config - Save Firebase credentials from Admin UI form
notificationsRouter.post(
  '/fcm-config',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body || {};
      let {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId,
        vapidKey,
        clientEmail,
        privateKey,
        serviceAccountJson,
      } = body;

      // Auto-extract from service account JSON if user pasted the raw credentials file
      if (serviceAccountJson) {
        try {
          const parsed = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
          if (parsed.project_id && !projectId) projectId = parsed.project_id;
          if (parsed.client_email && !clientEmail) clientEmail = parsed.client_email;
          if (parsed.private_key && !privateKey) privateKey = parsed.private_key;
        } catch (e: any) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Service Account JSON format. Please check the JSON syntax.',
          });
        }
      }

      const updated = await saveStoredFirebaseConfig({
        ...(apiKey !== undefined && { apiKey }),
        ...(authDomain !== undefined && { authDomain }),
        ...(projectId !== undefined && { projectId }),
        ...(storageBucket !== undefined && { storageBucket }),
        ...(messagingSenderId !== undefined && { messagingSenderId }),
        ...(appId !== undefined && { appId }),
        ...(vapidKey !== undefined && { vapidKey }),
        ...(clientEmail !== undefined && { clientEmail }),
        ...(privateKey !== undefined && { privateKey }),
      });

      const hasAdmin = Boolean(updated.projectId && updated.clientEmail && updated.privateKey);
      const isClientConfigured = Boolean(updated.apiKey && updated.projectId && updated.messagingSenderId);

      // Verify Firebase messaging initialization
      let adminInitSuccess = false;
      let adminError: string | undefined;
      if (hasAdmin) {
        try {
          const messaging = getFirebaseMessaging();
          adminInitSuccess = Boolean(messaging);
        } catch (err: any) {
          adminError = err?.message || 'Failed to initialize Firebase Admin';
        }
      }

      return res.json({
        success: true,
        message: 'Firebase configuration saved successfully!',
        configured: isClientConfigured,
        hasAdminCredentials: hasAdmin,
        adminInitSuccess,
        adminError,
        config: {
          apiKey: updated.apiKey,
          authDomain: updated.authDomain,
          projectId: updated.projectId,
          storageBucket: updated.storageBucket,
          messagingSenderId: updated.messagingSenderId,
          appId: updated.appId,
          vapidKey: updated.vapidKey,
        },
      });
    } catch (err: any) {
      console.error('[FCM Route] Error saving FCM configuration:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to save Firebase configuration.',
      });
    }
  }
);

// DELETE /api/notifications/fcm-config - Clear stored Firebase credentials
notificationsRouter.delete(
  '/fcm-config',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await clearStoredFirebaseConfig();
      return res.json({
        success: true,
        message: 'Firebase credentials cleared.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to clear credentials.',
      });
    }
  }
);

// POST /api/notifications/verify-admin-fcm - Check Firebase Admin connection status
notificationsRouter.post(
  '/verify-admin-fcm',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const cfg = getStoredFirebaseConfig();
    const hasAdmin = Boolean(cfg.projectId && cfg.clientEmail && cfg.privateKey);

    if (!hasAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete Admin credentials: Project ID, Client Email, and Private Key are required.',
      });
    }

    try {
      const messaging = getFirebaseMessaging();
      if (!messaging) {
        return res.status(500).json({
          success: false,
          message: 'Firebase Admin could not be initialized with current credentials.',
        });
      }

      return res.json({
        success: true,
        message: 'Firebase Admin SDK is initialized and ready to dispatch push notifications.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Admin SDK verification failed: ${err.message || err}`,
      });
    }
  }
);

// POST /api/notifications/register-token - Save user's FCM token
notificationsRouter.post('/register-token', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const token = req.body.token || req.body.fcmToken;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Valid FCM token string is required.' });
  }

  const updatedUser = db.updateUserFcmToken(currentUser.id, token.trim());
  if (!updatedUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  return res.json({
    success: true,
    message: 'FCM token registered successfully.',
    fcmToken: updatedUser.fcmToken,
  });
});

// POST /api/notifications/test-push - Send a test push notification to current user's registered FCM device
notificationsRouter.post('/test-push', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const user = db.getUserById(currentUser.id);

  if (!user?.fcmToken) {
    return res.status(400).json({
      success: false,
      message: 'No FCM token registered for this user. Please click "Enable FCM Notifications" first.',
    });
  }

  const result = await sendFcmPushNotification(user.fcmToken, {
    title: req.body.title || 'PlanForge Push Alert',
    body: req.body.message || 'Firebase Cloud Messaging push notification received successfully!',
    linkUrl: req.body.linkUrl || '/',
    data: {
      type: 'GENERAL',
      isTest: 'true',
    },
  });

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: `Failed to send FCM push notification: ${result.error}`,
    });
  }

  return res.json({
    success: true,
    message: 'Test push notification sent successfully!',
  });
});

// GET /api/notifications - Get current user notifications
notificationsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const notifications = db.getNotificationsByUserId(currentUser.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.json({
    notifications,
    unreadCount,
  });
});

// PUT /api/notifications/:id/read - Mark one as read
notificationsRouter.put('/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  const notif = db.markNotificationRead(id, currentUser.id);
  if (!notif) {
    return res.status(404).json({ message: 'Notification not found.' });
  }

  const notifications = db.getNotificationsByUserId(currentUser.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.json({
    notification: notif,
    unreadCount,
  });
});

// PUT /api/notifications/read-all - Mark all as read
notificationsRouter.put('/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const result = db.markAllNotificationsRead(currentUser.id);

  const notifications = db.getNotificationsByUserId(currentUser.id);

  return res.json({
    success: true,
    updatedCount: result.updatedCount,
    unreadCount: 0,
    notifications,
  });
});

// DELETE /api/notifications/:id - Delete a notification
notificationsRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  const deleted = db.deleteNotification(id, currentUser.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Notification not found.' });
  }

  const notifications = db.getNotificationsByUserId(currentUser.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.json({
    success: true,
    message: 'Notification deleted.',
    unreadCount,
  });
});
