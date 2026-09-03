import { Router, Response } from 'express';
import { db, ProjectStatus, ProjectPriority } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser } from '../auth.ts';

export const projectsRouter = Router();

// GET /api/projects
projectsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search, status, priority, clientId } = req.query;

  let allProjects = db.getProjects();
  db.recalculateAllProjectProgress();

  // Role Scoping
  if (currentUser.role === 'CLIENT') {
    const matchingClients = db.getClients().filter(
      (c) => c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
    const clientIds = new Set(matchingClients.map((c) => c.id));
    allProjects = allProjects.filter(
      (p) => clientIds.has(p.clientId) || p.createdById === currentUser.id
    );
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const memberProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    // Also include projects where user is assigned to tasks
    db.getTasks()
      .filter((t) => t.assignedToId === currentUser.id)
      .forEach((t) => memberProjectIds.add(t.projectId));

    allProjects = allProjects.filter((p) => memberProjectIds.has(p.id));
  }

  // Filtering
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    allProjects = allProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    allProjects = allProjects.filter((p) => p.status === status);
  }

  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    allProjects = allProjects.filter((p) => p.priority === priority);
  }

  if (clientId && typeof clientId === 'string') {
    allProjects = allProjects.filter((p) => p.clientId === clientId);
  }

  // Enrich with client info, task counts, and member counts
  const enriched = allProjects.map((proj) => {
    const client = db.getClientById(proj.clientId);
    const creator = db.getUserById(proj.createdById);
    const members = db.getProjectMembers(proj.id).map((pm) => {
      const u = db.getUserById(pm.userId);
      return u ? sanitizeUser(u) : null;
    }).filter(Boolean);
    const tasks = db.getTasks().filter((t) => t.projectId === proj.id);
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;

    return {
      ...proj,
      client: client || null,
      createdBy: creator ? sanitizeUser(creator) : null,
      members,
      taskCount: tasks.length,
      completedTaskCount: completedTasks,
    };
  });

  return res.json(enriched);
});

// GET /api/projects/:id
projectsRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  db.recalculateProjectProgress(id);
  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const client = db.getClientById(project.clientId);

  // Scoping check for Client & Team Member
  if (currentUser.role === 'CLIENT') {
    const isCreator = project.createdById === currentUser.id;
    const clientMatch = client && (client.email.toLowerCase() === currentUser.email.toLowerCase() || client.id === currentUser.id);
    if (!isCreator && !clientMatch) {
      return res.status(403).json({ message: 'Forbidden: Access to this project is restricted.' });
    }
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const isMember = db.getProjectMembers(id).some((pm) => pm.userId === currentUser.id);
    const hasAssignedTask = db.getTasks().some((t) => t.projectId === id && t.assignedToId === currentUser.id);
    if (!isMember && !hasAssignedTask && project.createdById !== currentUser.id) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this project.' });
    }
  }

  const creator = db.getUserById(project.createdById);
  const members = db.getProjectMembers(id).map((pm) => {
    const u = db.getUserById(pm.userId);
    return u ? { ...sanitizeUser(u), memberRecordId: pm.id } : null;
  }).filter(Boolean);

  const tasks = db.getTasks()
    .filter((t) => t.projectId === id)
    .map((t) => {
      const assigned = t.assignedToId ? db.getUserById(t.assignedToId) : null;
      return {
        ...t,
        assignedTo: assigned ? sanitizeUser(assigned) : null,
      };
    });

  const comments = db.getComments()
    .filter((c) => c.projectId === id && !c.taskId)
    .map((c) => {
      const author = db.getUserById(c.userId);
      return {
        ...c,
        user: author ? sanitizeUser(author) : { name: 'Unknown User' },
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const milestones = db.getMilestonesByProjectId(id).sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const approvals = db.getApprovalsByProjectId(id).map((appr) => {
    const requester = db.getUserById(appr.requestedById);
    const reviewer = appr.reviewedById ? db.getUserById(appr.reviewedById) : null;
    return {
      ...appr,
      requestedBy: requester ? sanitizeUser(requester) : null,
      reviewedBy: reviewer ? sanitizeUser(reviewer) : null,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;

  return res.json({
    ...project,
    client: client || null,
    createdBy: creator ? sanitizeUser(creator) : null,
    members,
    tasks,
    milestones,
    approvals,
    pendingApprovalsCount,
    comments,
    stats: {
      totalTasks: tasks.length,
      todoTasks: tasks.filter((t) => t.status === 'TODO').length,
      inProgressTasks: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      reviewTasks: tasks.filter((t) => t.status === 'REVIEW').length,
      completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
    }
  });
});

// POST /api/projects/client-request (CLIENT only)
projectsRouter.post('/client-request', requireAuth, requireRoles(['CLIENT']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { name, description, startDate, dueDate, estimatedBudget, leadOwnerId, preferredMeetingTime } = req.body;

    if (!name || !leadOwnerId || !preferredMeetingTime) {
      return res.status(400).json({ message: 'Project name, lead owner, and preferred meeting time are required.' });
    }

    // Resolve or auto-create client record tied directly to this client account
    let clientRecord = db.getClients().find(
      (c) => c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );

    if (!clientRecord) {
      const existingClientByEmail = db.getClientByEmail(currentUser.email);
      if (existingClientByEmail) {
        clientRecord = existingClientByEmail;
      } else {
        clientRecord = db.createClient({
          id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: currentUser.name,
          company: `${currentUser.name}'s Organization`,
          email: currentUser.email.toLowerCase(),
        });
      }
    }

    const resolvedClientId = clientRecord.id;

    const leadOwner = db.getUserById(leadOwnerId);
    if (!leadOwner) {
      return res.status(400).json({ message: 'Selected lead owner not found.' });
    }

    // Create client-initiated Project with status PLANNING (awaiting internal setup)
    const newProject = db.createProject({
      name: name.trim(),
      description: description ? description.trim() : null,
      clientId: resolvedClientId,
      createdById: currentUser.id,
      startDate: startDate || null,
      dueDate: dueDate || null,
      status: 'PLANNING',
      priority: 'MEDIUM',
      estimatedBudget: estimatedBudget ? Number(estimatedBudget) : null,
      leadOwnerId,
      preferredMeetingTime,
    });

    db.addProjectMember(newProject.id, leadOwnerId);

    const meetingLink = db.getMeetingLink();
    const meetingTime = new Date(preferredMeetingTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const clientCompany = clientRecord?.company || 'your organization';

    // Notify client (confirmation in-app notification)
    db.createNotification({
      id: `notif_${Date.now()}_cr1`,
      userId: currentUser.id,
      title: 'Project Request Received',
      message: `Your project "${newProject.name}" has been created and our team will reach out soon.${meetingLink ? ` Meeting scheduled for ${meetingTime}. Join: ${meetingLink}` : ` Preferred meeting time: ${meetingTime}.`}`,
      type: 'PROJECT_ASSIGNED',
      linkUrl: `/projects/${newProject.id}`,
      isRead: false,
    });

    // Notify assigned Lead Owner
    db.createNotification({
      id: `notif_${Date.now()}_cr2`,
      userId: leadOwnerId,
      title: 'New Client Project Request',
      message: `${currentUser.name} (${clientCompany}) submitted a new project request: "${newProject.name}". Preferred meeting: ${meetingTime}.`,
      type: 'PROJECT_ASSIGNED',
      linkUrl: `/projects/${newProject.id}`,
      isRead: false,
    });

    // Notify internal team Admins
    const admins = db.getUsers().filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    for (const admin of admins) {
      if (admin.id === leadOwnerId) continue;
      db.createNotification({
        id: `notif_${Date.now()}_cr3_${admin.id}`,
        userId: admin.id,
        title: 'New Client Project Request',
        message: `${currentUser.name} (${clientCompany}) submitted a new project request: "${newProject.name}". Lead: ${leadOwner.name}.`,
        type: 'GENERAL',
        linkUrl: `/projects/${newProject.id}`,
        isRead: false,
      });
    }

    return res.status(201).json({
      project: newProject,
      meetingLink: meetingLink || null,
      meetingTime,
      message: 'Your project has been created and our team will reach out soon.',
    });
  } catch (error: any) {
    console.error('Error creating client project request:', error);
    return res.status(500).json({ message: 'Failed to submit project request.' });
  }
});

// POST /api/projects (SUPER_ADMIN, ADMIN)
projectsRouter.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;

  if (currentUser.role === 'CLIENT') {
    return res.status(403).json({ message: 'Clients must use POST /api/projects/client-request to submit project requests.' });
  }
  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only admins can create projects.' });
  }

  try {
    const { name, description, clientId, startDate, dueDate, status, priority, memberIds } = req.body;

    if (!name || !clientId) {
      return res.status(400).json({ message: 'Project name and Client are required.' });
    }

    const client = db.getClientById(clientId);
    if (!client) {
      return res.status(400).json({ message: 'Selected client does not exist.' });
    }

    const newProject = db.createProject({
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description ? description.trim() : null,
      clientId,
      createdById: currentUser.id,
      startDate: startDate || null,
      dueDate: dueDate || null,
      status: (status as ProjectStatus) || 'PLANNING',
      priority: (priority as ProjectPriority) || 'MEDIUM',
      progress: 0,
    });

    // Assign initial members if provided
    if (Array.isArray(memberIds)) {
      memberIds.forEach((uid) => {
        if (typeof uid === 'string') {
          db.addProjectMember(newProject.id, uid);
        }
      });
    }

    return res.status(201).json(newProject);
  } catch (error: any) {
    console.error('Error creating project:', error);
    return res.status(500).json({ message: 'Failed to create project.' });
  }
});

// PATCH /api/projects/:id (SUPER_ADMIN, ADMIN)
projectsRouter.patch('/:id', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, clientId, startDate, dueDate, status, priority } = req.body;

    const existing = db.getProjectById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (clientId) {
      const client = db.getClientById(clientId);
      if (!client) return res.status(400).json({ message: 'Client does not exist.' });
      updates.clientId = clientId;
    }
    if (startDate !== undefined) updates.startDate = startDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;

    const updated = db.updateProject(id, updates);
    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating project:', error);
    return res.status(500).json({ message: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id (SUPER_ADMIN, ADMIN)
projectsRouter.delete('/:id', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.getProjectById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const success = db.deleteProject(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete project.' });
  }

  return res.json({ message: 'Project and associated tasks/comments deleted successfully.', deletedId: id });
});

// POST /api/projects/:id/members (SUPER_ADMIN, ADMIN)
projectsRouter.post('/:id/members', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const newMember = db.addProjectMember(id, userId);
  if (!newMember) {
    return res.status(409).json({ message: 'User is already a member of this project.' });
  }

  return res.status(201).json({
    ...newMember,
    user: sanitizeUser(user),
  });
});

// DELETE /api/projects/:id/members/:userId (SUPER_ADMIN, ADMIN)
projectsRouter.delete('/:id/members/:userId', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id, userId } = req.params;

  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const success = db.removeProjectMember(id, userId);
  if (!success) {
    return res.status(404).json({ message: 'Member assignment not found for this project.' });
  }

  return res.json({ message: 'Member removed from project successfully.' });
});
