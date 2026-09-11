import { Router, Response } from 'express';
import { db, MilestoneStatus } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';

export const milestonesRouter = Router();

// GET /api/milestones - List all milestones with filters and role scoping
milestonesRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { projectId, status, search } = req.query;

  let allMilestones = db.getMilestones();

  // Role scoping: Clients and Client Admins only see milestones of their projects
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const matchingClients = db.getClients().filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
    const clientIds = new Set(matchingClients.map((c) => c.id));
    const allowedProjectIds = new Set(
      db.getProjects().filter((p) => clientIds.has(p.clientId)).map((p) => p.id)
    );
    allMilestones = allMilestones.filter((m) => allowedProjectIds.has(m.projectId));
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const memberProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    db.getTasks()
      .filter((t) => t.assignedToId === currentUser.id)
      .forEach((t) => memberProjectIds.add(t.projectId));
    allMilestones = allMilestones.filter((m) => memberProjectIds.has(m.projectId));
  }

  if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
    allMilestones = allMilestones.filter((m) => m.projectId === projectId);
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    allMilestones = allMilestones.filter((m) => m.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    allMilestones = allMilestones.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }

  // Enrich with project summary
  const enriched = allMilestones.map((m) => {
    const project = db.getProjectById(m.projectId);
    return {
      ...m,
      project: project ? { id: project.id, name: project.name, status: project.status } : null,
    };
  }).sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return res.json(enriched);
});

// Helper to verify user authorization for a project's milestones
function isUserAuthorizedForProject(user: any, projectId: string): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;

  const project = db.getProjectById(projectId);
  if (!project) return false;

  if (user.role === 'TEAM_MEMBER') {
    return (
      db.getProjectMembers(projectId).some((pm) => pm.userId === user.id) ||
      db.getTasks().some((t) => t.projectId === projectId && t.assignedToId === user.id) ||
      project.createdById === user.id
    );
  }

  if (user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN') {
    const client = db.getClientById(project.clientId);
    return Boolean(
      (user.clientId && client && client.id === user.clientId) ||
      (client && client.email.toLowerCase() === user.email.toLowerCase()) ||
      project.clientId === user.id ||
      project.createdById === user.id
    );
  }

  return false;
}

// GET /api/milestones/:id
milestonesRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const milestone = db.getMilestoneById(id);

  if (!milestone) {
    return res.status(404).json({ message: 'Milestone not found.' });
  }

  if (!isUserAuthorizedForProject(currentUser, milestone.projectId)) {
    return res.status(403).json({ message: 'Forbidden: Access to this milestone is restricted.' });
  }

  const project = db.getProjectById(milestone.projectId);
  return res.json({
    ...milestone,
    project: project ? { id: project.id, name: project.name, status: project.status } : null,
  });
});

// POST /api/milestones - Create milestone (SUPER_ADMIN, ADMIN)
milestonesRouter.post(
  '/',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { name, description, projectId, dueDate, status, progress } = req.body;

    if (!name || !projectId) {
      return res.status(400).json({ message: 'Milestone name and project ID are required.' });
    }

    const project = db.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found.' });
    }

    const newMilestone = db.createMilestone({
      name: name.trim(),
      description: description ? description.trim() : null,
      projectId,
      dueDate: dueDate || null,
      status: (status as MilestoneStatus) || 'PENDING',
      progress: typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 0,
    });

    const enriched = {
      ...newMilestone,
      project: { id: project.id, name: project.name, status: project.status },
    };

    return res.status(201).json(enriched);
  }
);

// PUT /api/milestones/:id - Update milestone
milestonesRouter.put(
  '/:id',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { id } = req.params;
    const existing = db.getMilestoneById(id);

    if (!existing) {
      return res.status(404).json({ message: 'Milestone not found.' });
    }

    // Clients and Client Admins cannot edit milestones
    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Clients cannot modify milestones.' });
    }

    // Team members can only update milestones for projects they belong to
    if (currentUser.role === 'TEAM_MEMBER') {
      const isMember = db.getProjectMembers(existing.projectId).some((pm) => pm.userId === currentUser.id);
      const hasTask = db.getTasks().some((t) => t.projectId === existing.projectId && t.assignedToId === currentUser.id);
      const project = db.getProjectById(existing.projectId);
      if (!isMember && !hasTask && project?.createdById !== currentUser.id) {
        return res.status(403).json({ message: 'Forbidden: You can only update milestones in projects you are assigned to.' });
      }
    }

    const { name, description, dueDate, status, progress, projectId } = req.body;

    const updates: Partial<Parameters<typeof db.updateMilestone>[1]> = {};

    if (currentUser.role === 'TEAM_MEMBER') {
      // Team members can update status and progress
      if (status !== undefined) updates.status = status as MilestoneStatus;
      if (progress !== undefined) updates.progress = Math.max(0, Math.min(100, Number(progress)));
    } else {
      // Admins can update all fields
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description ? description.trim() : null;
      if (dueDate !== undefined) updates.dueDate = dueDate || null;
      if (status !== undefined) updates.status = status as MilestoneStatus;
      if (progress !== undefined) updates.progress = Math.max(0, Math.min(100, Number(progress)));
      if (projectId !== undefined) updates.projectId = projectId;
    }

    // If status is COMPLETED and progress not provided, set progress to 100
    if (updates.status === 'COMPLETED' && updates.progress === undefined) {
      updates.progress = 100;
    }

    const updated = db.updateMilestone(id, updates);
    if (!updated) {
      return res.status(500).json({ message: 'Failed to update milestone.' });
    }

    const project = db.getProjectById(updated.projectId);
    return res.json({
      ...updated,
      project: project ? { id: project.id, name: project.name, status: project.status } : null,
    });
  }
);

// DELETE /api/milestones/:id - (SUPER_ADMIN, ADMIN)
milestonesRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deleted = db.deleteMilestone(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Milestone not found or already deleted.' });
    }

    return res.json({ success: true, message: 'Milestone deleted successfully.' });
  }
);
