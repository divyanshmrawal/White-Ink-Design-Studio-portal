import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

export const pushRouter = Router();

pushRouter.use(requireAuth);

// POST /subscribe - Save web push subscription
pushRouter.post('/subscribe', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return res.status(400).json({ message: 'Invalid push subscription object.' });
    }

    const sub = db.savePushSubscription({
      userId: req.user!.id,
      endpoint,
      authKey: keys.auth,
      p256dhKey: keys.p256dh,
    });

    return res.status(201).json({ message: 'Push notifications subscribed successfully.', subscription: sub });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to save push subscription.' });
  }
});

// POST /unsubscribe - Remove web push subscription
pushRouter.post('/unsubscribe', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      db.removePushSubscription(endpoint);
    }
    return res.status(200).json({ message: 'Push notifications unsubscribed.' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to unsubscribe.' });
  }
});
