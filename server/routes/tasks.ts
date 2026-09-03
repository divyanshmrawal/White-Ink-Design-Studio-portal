import { Router, Response } from 'express';
import { db, TaskStatus, TaskPriority } from '../db.ts';
import { requireAuth, AuthenticatedRequest, sanitizeUser } from '../auth.ts';

export const tasksRouter = Router();

// GET /api/tasks
tasksRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search, status, priority, projectId, assignedToId } = req.query;

  let allTasks = db.getTasks();

  // Role scoping
  if (currentUser.role === 'CLIENT') {
    const clientProjects = db.getProjects().filter((p) => {
      const client = db.getClientById(p.clientId);
      return (client && client.email.toLowerCase() === currentUser.email.toLowerCase()) || p.clientId === currentUser.id;
    });
    const allowedProjectIds = new Set(clientProjects.map((p) => p.id));
    allTasks = allTasks.filter((t) => allowedProjectIds.has(t.projectId));
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const assignedProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    allTasks = allTasks.filter(
      (t) => t.assignedToId === currentUser.id || assignedProjectIds.has(t.projectId)
    );
  }

  // Filters
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    allTasks = allTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    allTasks = allTasks.filter((t) => t.status === status);
  }

  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    allTasks = allTasks.filter((t) => t.priority === priority);
  }

  if (projectId && typeof projectId === 'string') {
    allTasks = allTasks.filter((t) => t.projectId === projectId);
  }

  if (assignedToId && typeof assignedToId === 'string') {
    if (assignedToId === 'unassigned') {
      allTasks = allTasks.filter((t) => !t.assignedToId);
    } else {
      allTasks = allTasks.filter((t) => t.assignedToId === assignedToId);
    }
  }

  // Enrich tasks with project and user objects
  const enriched = allTasks.map((t) => {
    const project = db.getProjectById(t.projectId);
    const assignedTo = t.assignedToId ? db.getUserById(t.assignedToId) : null;
    const createdBy = db.getUserById(t.createdById);
    const commentsCount = db.getComments().filter((c) => c.taskId === t.id).length;

    return {
      ...t,
      project: project ? { id: project.id, name: project.name, status: project.status } : null,
      assignedTo: assignedTo ? sanitizeUser(assignedTo) : null,
      createdBy: createdBy ? sanitizeUser(createdBy) : null,
      commentsCount,
    };
  });

  return res.json(enriched);
});

// GET /api/tasks/:id
tasksRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  const task = db.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const project = db.getProjectById(task.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Associated project not found.' });
  }

  // Role scoping
  if (currentUser.role === 'CLIENT') {
    const client = db.getClientById(project.clientId);
    if (!client || (client.email.toLowerCase() !== currentUser.email.toLowerCase() && client.id !== currentUser.id)) {
      return res.status(403).json({ message: 'Forbidden: Access to this task is restricted.' });
    }
  }

  const assignedTo = task.assignedToId ? db.getUserById(task.assignedToId) : null;
  const createdBy = db.getUserById(task.createdById);
  const comments = db.getComments()
    .filter((c) => c.taskId === task.id)
    .map((c) => {
      const u = db.getUserById(c.userId);
      return {
        ...c,
        user: u ? sanitizeUser(u) : { name: 'Unknown User' },
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    ...task,
    project,
    assignedTo: assignedTo ? sanitizeUser(assignedTo) : null,
    createdBy: createdBy ? sanitizeUser(createdBy) : null,
    comments,
  });
});

// POST /api/tasks
tasksRouter.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { title, description, projectId, assignedToId, status, priority, progress, dueDate } = req.body;

    if (currentUser.role === 'CLIENT') {
      return res.status(403).json({ message: 'Clients cannot create internal tasks.' });
    }

    if (!title || !projectId) {
      return res.status(400).json({ message: 'Task title and Project ID are required.' });
    }

    const project = db.getProjectById(projectId);
    if (!project) {
      return res.status(400).json({ message: 'Referenced project does not exist.' });
    }

    const newTask = db.createTask({
      id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description ? description.trim() : null,
      projectId,
      assignedToId: assignedToId || null,
      createdById: currentUser.id,
      status: (status as TaskStatus) || 'TODO',
      priority: (priority as TaskPriority) || 'MEDIUM',
      progress: typeof progress === 'number' ? progress : 0,
      dueDate: dueDate || null,
    });

    const assigned = newTask.assignedToId ? db.getUserById(newTask.assignedToId) : null;

    return res.status(201).json({
      ...newTask,
      project: { id: project.id, name: project.name },
      assignedTo: assigned ? sanitizeUser(assigned) : null,
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return res.status(500).json({ message: 'Failed to create task.' });
  }
});

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { title, description, projectId, assignedToId, status, priority, progress, dueDate } = req.body;

    const existing = db.getTaskById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Role checks
    if (currentUser.role === 'CLIENT') {
      return res.status(403).json({ message: 'Clients cannot modify task configuration.' });
    }

    // Team members can update status/progress or description on their assigned tasks
    if (currentUser.role === 'TEAM_MEMBER') {
      const isAssigned = existing.assignedToId === currentUser.id;
      const isProjectMember = db.getProjectMembers(existing.projectId).some((pm) => pm.userId === currentUser.id);
      if (!isAssigned && !isProjectMember && existing.createdById !== currentUser.id) {
        return res.status(403).json({ message: 'You can only update tasks in projects you are assigned to.' });
      }
    }

    const updates: any = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (projectId) updates.projectId = projectId;
    if (assignedToId !== undefined) updates.assignedToId = assignedToId || null;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (typeof progress === 'number') updates.progress = progress;
    if (dueDate !== undefined) updates.dueDate = dueDate;

    const updated = db.updateTask(id, updates);
    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating task:', error);
    return res.status(500).json({ message: 'Failed to update task.' });
  }
});

// PATCH /api/tasks/:id/approve (CLIENT role only)
tasksRouter.patch('/:id/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  if (currentUser.role !== 'CLIENT') {
    return res.status(403).json({ message: 'Only clients can approve tasks.' });
  }

  const task = db.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  // Verify the task belongs to a project owned by this client
  const project = db.getProjectById(task.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Associated project not found.' });
  }
  const client = db.getClientById(project.clientId);
  if (!client || client.email.toLowerCase() !== currentUser.email.toLowerCase()) {
    return res.status(403).json({ message: 'Forbidden: This task does not belong to your project.' });
  }

  const updated = db.updateTask(id, { status: 'COMPLETED' });

  // Log activity
  db.logActivity({
    userId: currentUser.id,
    action: 'TASK_APPROVED',
    entityType: 'TASK',
    entityId: id,
    details: `Client approved task "${task.title}"`,
  });

  // Notify assigned team member
  if (task.assignedToId) {
    db.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: task.assignedToId,
      title: 'Task Approved by Client',
      message: `The client has approved your task: "${task.title}"`,
      type: 'TASK_STATUS',
      linkUrl: `/projects/${task.projectId}`,
      isRead: false,
    });
  }

  return res.json(updated);
});

// PATCH /api/tasks/:id/status (Kanban & quick status toggle)
tasksRouter.patch('/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { status } = req.body;

  if (currentUser.role === 'CLIENT') {
    return res.status(403).json({ message: 'Clients cannot change task status.' });
  }

  if (!status || !['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value. Must be TODO, IN_PROGRESS, REVIEW, or COMPLETED.' });
  }

  const existing = db.getTaskById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const updated = db.updateTask(id, { status: status as TaskStatus });
  return res.json(updated);
});

// PATCH /api/tasks/:id/progress
tasksRouter.patch('/:id/progress', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { progress } = req.body;

  if (currentUser.role === 'CLIENT') {
    return res.status(403).json({ message: 'Clients cannot modify task progress directly.' });
  }

  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return res.status(400).json({ message: 'Progress must be a number between 0 and 100.' });
  }

  const existing = db.getTaskById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const updated = db.updateTask(id, { progress: Math.round(progress) });
  return res.json(updated);
});

// DELETE /api/tasks/:id (SUPER_ADMIN and ADMIN)
tasksRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only Admins and Super Admins can delete tasks.' });
  }

  const existing = db.getTaskById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const success = db.deleteTask(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete task.' });
  }

  return res.json({ message: 'Task deleted successfully.', deletedId: id });
});
