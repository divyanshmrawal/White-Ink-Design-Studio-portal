import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest, sanitizeUser } from '../auth.ts';

export const commentsRouter = Router();

// GET /api/projects/:id/comments
commentsRouter.get('/projects/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
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
  const task = db.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
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
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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
