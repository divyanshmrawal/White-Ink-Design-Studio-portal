import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest, sanitizeUser } from '../auth.ts';

export const commentsRouter = Router();

/**
 * Helper to verify user authorization for a project's comment threads
 */
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

// GET /api/projects/:id/comments
commentsRouter.get('/projects/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;

  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  if (!isUserAuthorizedForProject(currentUser, id)) {
    return res.status(403).json({ message: 'Forbidden: Access to this project comments is restricted.' });
  }

  const comments = db.getComments()
    .filter((c) => c.projectId === id && !c.taskId)
    .map((c) => {
      const author = db.getUserById(c.userId);
      return {
        ...c,
        user: author ? sanitizeUser(author) : { name: 'Unknown User' },
      };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return res.json(comments);
});

// POST /api/projects/:id/comments
commentsRouter.post('/projects/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Comment content cannot be empty.' });
  }

  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  if (!isUserAuthorizedForProject(currentUser, id)) {
    return res.status(403).json({ message: 'Forbidden: You cannot comment on this project.' });
  }

  const newComment = db.createComment({
    content: content.trim(),
    userId: currentUser.id,
    projectId: id,
    taskId: null,
  });

  return res.status(201).json({
    ...newComment,
    user: sanitizeUser(currentUser),
  });
});

// GET /api/tasks/:id/comments
commentsRouter.get('/tasks/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;

  const task = db.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  if (!isUserAuthorizedForProject(currentUser, task.projectId)) {
    return res.status(403).json({ message: 'Forbidden: Access to this task comments is restricted.' });
  }

  const comments = db.getComments()
    .filter((c) => c.taskId === id)
    .map((c) => {
      const author = db.getUserById(c.userId);
      return {
        ...c,
        user: author ? sanitizeUser(author) : { name: 'Unknown User' },
      };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(comments);
});

// POST /api/tasks/:id/comments
commentsRouter.post('/tasks/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Comment content cannot be empty.' });
  }

  const task = db.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  if (!isUserAuthorizedForProject(currentUser, task.projectId)) {
    return res.status(403).json({ message: 'Forbidden: You cannot comment on this task.' });
  }

  const newComment = db.createComment({
    content: content.trim(),
    userId: currentUser.id,
    projectId: task.projectId,
    taskId: id,
  });

  return res.status(201).json({
    ...newComment,
    user: sanitizeUser(currentUser),
  });
});

// DELETE /api/comments/:id
commentsRouter.delete('/comments/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  const comment = db.getCommentById(id);
  if (!comment) {
    return res.status(404).json({ message: 'Comment not found.' });
  }

  const isAuthor = comment.userId === currentUser.id;
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden: You can only delete your own comments.' });
  }

  const success = db.deleteComment(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete comment.' });
  }

  return res.json({ message: 'Comment deleted successfully.', deletedId: id });
});

