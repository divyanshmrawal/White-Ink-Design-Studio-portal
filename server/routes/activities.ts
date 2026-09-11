import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth);

// GET / - Get recent activity logs with role-based scoping
activitiesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
    const userId = isAdmin ? (req.query.userId as string | undefined) : undefined;
    const entityType = req.query.entityType as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    let activities = db.getActivities({ userId, entityType, limit: 500 });

    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      const matchingClients = db.getClients().filter(
        (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
      );
      const clientIds = new Set(matchingClients.map((c) => c.id));
      const allowedProjectIds = new Set(
        db.getProjects().filter((p) => clientIds.has(p.clientId) || p.createdById === currentUser.id).map((p) => p.id)
      );
      const allowedTaskIds = new Set(
        db.getTasks().filter((t) => allowedProjectIds.has(t.projectId)).map((t) => t.id)
      );

      activities = activities.filter((a) => {
        if (a.userId === currentUser.id) return true;
        if (a.entityType === 'PROJECT' && allowedProjectIds.has(a.entityId)) return true;
        if (a.entityType === 'TASK' && allowedTaskIds.has(a.entityId)) return true;
        return false;
      });
    } else if (currentUser.role === 'TEAM_MEMBER') {
      const memberProjectIds = new Set(
        db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
      );
      db.getTasks()
        .filter((t) => t.assignedToId === currentUser.id)
        .forEach((t) => memberProjectIds.add(t.projectId));
      const memberTaskIds = new Set(
        db.getTasks().filter((t) => memberProjectIds.has(t.projectId)).map((t) => t.id)
      );

      activities = activities.filter((a) => {
        if (a.userId === currentUser.id) return true;
        if (a.entityType === 'PROJECT' && memberProjectIds.has(a.entityId)) return true;
        if (a.entityType === 'TASK' && memberTaskIds.has(a.entityId)) return true;
        return false;
      });
    }

    return res.status(200).json(activities.slice(0, limit));
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch activity logs.' });
  }
});
