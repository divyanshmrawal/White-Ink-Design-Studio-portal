import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

export const chatRouter = Router();

chatRouter.use(requireAuth);

// GET /messages - List messages in channel
chatRouter.get('/messages', (req: AuthenticatedRequest, res: Response) => {
  try {
    const channel = (req.query.channel as string) || 'general';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const messages = db.getChatMessages({ channel, limit });
    return res.status(200).json(messages);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch messages.' });
  }
});

// POST /messages - Post a new message
chatRouter.post('/messages', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, channel, attachments } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    const message = db.createChatMessage({
      senderId: req.user!.id,
      channel: channel || 'general',
      content: content.trim(),
      attachments: attachments ? JSON.stringify(attachments) : null,
    });

    return res.status(201).json(message);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to post message.' });
  }
});

// DELETE /messages/:id - Delete a message
chatRouter.delete('/messages/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const success = db.deleteChatMessage(req.params.id, req.user!.id, isAdmin);
    if (!success) {
      return res.status(404).json({ message: 'Message not found.' });
    }
    return res.status(200).json({ message: 'Message deleted.' });
  } catch (err: any) {
    return res.status(403).json({ message: err.message || 'Failed to delete message.' });
  }
});
