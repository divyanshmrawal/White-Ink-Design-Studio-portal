import { Router, Response } from 'express';
import { db, ApprovalStatus } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser } from '../auth.ts';

export const approvalsRouter = Router();

// GET /api/approvals - List approvals with role scoping
approvalsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { projectId, status, search } = req.query;

  let allApprovals = db.getApprovals();

  // Role scoping:
  if (currentUser.role === 'CLIENT') {
    const matchingClients = db.getClients().filter(
      (c) => c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
    const clientIds = new Set(matchingClients.map((c) => c.id));
    const allowedProjectIds = new Set(
      db.getProjects().filter((p) => clientIds.has(p.clientId)).map((p) => p.id)
    );
    allApprovals = allApprovals.filter((a) => allowedProjectIds.has(a.projectId));
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const memberProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    db.getTasks()
      .filter((t) => t.assignedToId === currentUser.id)
      .forEach((t) => memberProjectIds.add(t.projectId));
    allApprovals = allApprovals.filter(
      (a) => memberProjectIds.has(a.projectId) || a.requestedById === currentUser.id
    );
  }

  if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
    allApprovals = allApprovals.filter((a) => a.projectId === projectId);
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    allApprovals = allApprovals.filter((a) => a.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    allApprovals = allApprovals.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }

  // Enrich with project, requestedBy, and reviewedBy
  const enriched = allApprovals.map((appr) => {
    const project = db.getProjectById(appr.projectId);
    const client = project ? db.getClientById(project.clientId) : null;
    const requestedBy = db.getUserById(appr.requestedById);
    const reviewedBy = appr.reviewedById ? db.getUserById(appr.reviewedById) : null;

    return {
      ...appr,
      project: project
        ? {
            id: project.id,
            name: project.name,
            clientId: project.clientId,
            client: client || null,
          }
        : null,
      requestedBy: requestedBy ? sanitizeUser(requestedBy) : null,
      reviewedBy: reviewedBy ? sanitizeUser(reviewedBy) : null,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(enriched);
});

// GET /api/approvals/:id
approvalsRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const appr = db.getApprovalById(id);

  if (!appr) {
    return res.status(404).json({ message: 'Approval request not found.' });
  }

  const project = db.getProjectById(appr.projectId);
  const client = project ? db.getClientById(project.clientId) : null;
  const requestedBy = db.getUserById(appr.requestedById);
  const reviewedBy = appr.reviewedById ? db.getUserById(appr.reviewedById) : null;

  return res.json({
    ...appr,
    project: project
      ? {
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          client: client || null,
        }
      : null,
    requestedBy: requestedBy ? sanitizeUser(requestedBy) : null,
    reviewedBy: reviewedBy ? sanitizeUser(reviewedBy) : null,
  });
});

// POST /api/approvals - Request an approval (SUPER_ADMIN, ADMIN, TEAM_MEMBER)
approvalsRouter.post(
  '/',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;

    if (currentUser.role === 'CLIENT') {
      return res.status(403).json({ message: 'Clients cannot request internal approvals.' });
    }

    const { title, description, projectId, deliverableUrl } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ message: 'Deliverable title and project ID are required.' });
    }

    const project = db.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found.' });
    }

    const newApproval = db.createApproval({
      title: title.trim(),
      description: description ? description.trim() : null,
      projectId,
      deliverableUrl: deliverableUrl ? deliverableUrl.trim() : null,
      status: 'PENDING',
      requestedById: currentUser.id,
      reviewedById: null,
      reviewedAt: null,
      comments: null,
    });

    const client = db.getClientById(project.clientId);
    const enriched = {
      ...newApproval,
      project: {
        id: project.id,
        name: project.name,
        clientId: project.clientId,
        client: client || null,
      },
      requestedBy: sanitizeUser(currentUser),
      reviewedBy: null,
    };

    return res.status(201).json(enriched);
  }
);

// PUT /api/approvals/:id - Review, approve, or reject
approvalsRouter.put(
  '/:id',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { id } = req.params;
    const existing = db.getApprovalById(id);

    if (!existing) {
      return res.status(404).json({ message: 'Approval request not found.' });
    }

    const { status, comments, deliverableUrl, title, description } = req.body;

    const updates: Partial<Parameters<typeof db.updateApproval>[1]> = {};

    // If client is resolving the approval:
    if (currentUser.role === 'CLIENT') {
      if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
      }
      updates.status = status as ApprovalStatus;
      updates.comments = comments ? comments.trim() : null;
      updates.reviewedById = currentUser.id;
      updates.reviewedAt = new Date().toISOString();
    } else {
      // Super Admin or Admin can update all fields or approve/reject on behalf
      if (status !== undefined) {
        updates.status = status as ApprovalStatus;
        if (['APPROVED', 'REJECTED'].includes(status)) {
          updates.reviewedById = currentUser.id;
          updates.reviewedAt = new Date().toISOString();
        }
      }
      if (comments !== undefined) updates.comments = comments ? comments.trim() : null;
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description ? description.trim() : null;
      if (deliverableUrl !== undefined) updates.deliverableUrl = deliverableUrl ? deliverableUrl.trim() : null;
    }

    const updated = db.updateApproval(id, updates);
    if (!updated) {
      return res.status(500).json({ message: 'Failed to update approval.' });
    }

    const project = db.getProjectById(updated.projectId);
    const client = project ? db.getClientById(project.clientId) : null;
    const requestedBy = db.getUserById(updated.requestedById);
    const reviewedBy = updated.reviewedById ? db.getUserById(updated.reviewedById) : null;

    return res.json({
      ...updated,
      project: project
        ? {
            id: project.id,
            name: project.name,
            clientId: project.clientId,
            client: client || null,
          }
        : null,
      requestedBy: requestedBy ? sanitizeUser(requestedBy) : null,
      reviewedBy: reviewedBy ? sanitizeUser(reviewedBy) : null,
    });
  }
);

// DELETE /api/approvals/:id - (SUPER_ADMIN, ADMIN)
approvalsRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deleted = db.deleteApproval(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Approval request not found.' });
    }

    return res.json({ success: true, message: 'Approval deleted successfully.' });
  }
);
