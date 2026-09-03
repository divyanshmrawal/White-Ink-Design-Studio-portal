import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth);

// GET / - Get recent activity logs
activitiesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const userId = isAdmin ? (req.query.userId as string | undefined) : undefined;
    const entityType = req.query.entityType as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const activities = db.getActivities({ userId, entityType, limit });
    return res.status(200).json(activities);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch activity logs.' });
  }
});
