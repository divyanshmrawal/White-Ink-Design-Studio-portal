import { Router, Response } from 'express';
import multer from 'multer';
import { db, ApprovalStatus } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser } from '../auth.ts';
import { uploadFileToDrive, ensureProjectFolderStructure } from '../services/google/drive.ts';
import { sendTaskSubmittedForReviewEmail, sendApprovalDecisionEmail } from '../email.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const approvalsRouter = Router();

// GET /api/approvals - List approvals with role scoping
approvalsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { projectId, status, search } = req.query;

  let allApprovals = db.getApprovals();

  // Role scoping:
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const matchingClients = db.getClients().filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
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

// Helper to verify user authorization for a project's approvals
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

// GET /api/approvals/:id
approvalsRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const appr = db.getApprovalById(id);

  if (!appr) {
    return res.status(404).json({ message: 'Approval request not found.' });
  }

  if (!isUserAuthorizedForProject(currentUser, appr.projectId)) {
    return res.status(403).json({ message: 'Forbidden: Access to this approval request is restricted.' });
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

// POST /api/approvals - Request an approval / upload deliverable (SUPER_ADMIN, ADMIN, TEAM_MEMBER)
approvalsRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;

    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
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

    // Role check: TEAM_MEMBER must belong to the project
    if (currentUser.role === 'TEAM_MEMBER') {
      const isMember = db.getProjectMembers(projectId).some((pm) => pm.userId === currentUser.id);
      if (!isMember) {
        return res.status(403).json({ message: 'You can only submit deliverables for projects you are assigned to.' });
      }
    }

    let finalDeliverableUrl: string | null = deliverableUrl ? deliverableUrl.trim() : null;

    // Handle optional uploaded deliverable file to Google Drive "Deliverables" folder
    if (req.file) {
      try {
        const hierarchy = await ensureProjectFolderStructure({
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          driveFolderId: project.driveFolderId,
        });
        const targetFolderId = hierarchy.structure?.subfolders.deliverables || hierarchy.structure?.projectFolderId;
        if (targetFolderId) {
          const uploadResult = await uploadFileToDrive({
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            buffer: req.file.buffer,
            folderId: targetFolderId,
          });
          if (uploadResult.success && uploadResult.fileId) {
            finalDeliverableUrl = `/api/google/files/${uploadResult.fileId}/view`;
          }
        }
      } catch (driveErr: any) {
        console.warn('[DRIVE] Deliverable file upload skipped/failed:', driveErr?.message);
      }
    }

    const newApproval = db.createApproval({
      title: title.trim(),
      description: description ? description.trim() : null,
      projectId,
      deliverableUrl: finalDeliverableUrl,
      status: 'PENDING',
      requestedById: currentUser.id,
      reviewedById: null,
      reviewedAt: null,
      comments: null,
    });

    // Notify the client for review
    const client = db.getClientById(project.clientId);
    const clientUser = client
      ? db.getUsers().find((u) => u.clientId === client.id || u.email.toLowerCase() === client.email.toLowerCase())
      : null;
    if (clientUser) {
      db.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: clientUser.id,
        title: 'New Deliverable Ready for Review',
        message: `A new deliverable "${title.trim()}" in project "${project.name}" is ready for your review.`,
        type: 'APPROVAL_REQUESTED',
        linkUrl: `/projects/${project.id}`,
        isRead: false,
      });

      sendTaskSubmittedForReviewEmail({
        toEmail: clientUser.email,
        clientName: clientUser.name,
        taskTitle: title.trim(),
        projectName: project.name,
        submissionDescription: description ? description.trim() : undefined,
        deliverableUrl: finalDeliverableUrl,
      }).catch((emailErr) => console.warn('[EMAIL] Deliverable review request email dispatch failed:', emailErr?.message));
    }

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

    // If client or client admin is resolving the approval:
    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      const project = db.getProjectById(existing.projectId);
      const client = project ? db.getClientById(project.clientId) : null;
      const isClientOwner = Boolean(
        client &&
        ((currentUser.clientId && client.id === currentUser.clientId) ||
          client.email.toLowerCase() === currentUser.email.toLowerCase() ||
          client.id === currentUser.id ||
          project?.createdById === currentUser.id)
      );
      if (!isClientOwner) {
        return res.status(403).json({ message: 'Forbidden: You cannot review deliverables for this project.' });
      }

      if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Status must be APPROVED or REJECTED.' });
      }
      updates.status = status as ApprovalStatus;
      updates.comments = comments ? comments.trim() : null;
      updates.reviewedById = currentUser.id;
      updates.reviewedAt = new Date().toISOString();
    } else if (currentUser.role === 'TEAM_MEMBER') {
      const isMember = db.getProjectMembers(existing.projectId).some((pm) => pm.userId === currentUser.id);
      const isRequester = existing.requestedById === currentUser.id;
      if (!isMember && !isRequester) {
        return res.status(403).json({ message: 'Forbidden: You can only edit deliverables for your assigned projects.' });
      }
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description ? description.trim() : null;
      if (deliverableUrl !== undefined) updates.deliverableUrl = deliverableUrl ? deliverableUrl.trim() : null;
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

    // If approved or rejected, dispatch transactional email to the requester
    if (updates.status && ['APPROVED', 'REJECTED'].includes(updates.status) && requestedBy?.email) {
      sendApprovalDecisionEmail({
        toEmail: requestedBy.email,
        recipientName: requestedBy.name,
        itemTitle: updated.title,
        projectName: project?.name || 'Project',
        decision: updates.status as 'APPROVED' | 'REJECTED',
        clientName: currentUser.name,
        comments: updates.comments,
      }).catch((emailErr) => console.warn('[EMAIL] Deliverable sign-off email dispatch failed:', emailErr?.message));
    }

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
