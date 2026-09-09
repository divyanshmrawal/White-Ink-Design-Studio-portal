import { Router, Response } from 'express';
import { db } from '../db.ts';
import {
  requireAuth,
  requireRoles,
  AuthenticatedRequest,
  sanitizeUser,
  hashPassword,
  generateStrongPassword,
} from '../auth.ts';

export const credentialsRouter = Router();

// GET /api/credentials (SUPER_ADMIN only)
credentialsRouter.get(
  '/',
  requireAuth,
  requireRoles(['SUPER_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      // SUPER_ADMIN sees all issued credentials across the system
      const credentials = db.getIssuedCredentials();

      // Populate recipient and issuer metadata
      const populated = credentials.map((cred) => {
        const user = db.getUserById(cred.userId);
        const issuer = db.getUserById(cred.createdById);
        const client = user?.clientId ? db.getClientById(user.clientId) : null;

        return {
          id: cred.id,
          userId: cred.userId,
          email: cred.email,
          plaintextPassword: cred.plaintextPassword,
          createdById: cred.createdById,
          createdAt: cred.createdAt,
          user: user
            ? {
                ...sanitizeUser(user),
                companyName: client?.company || client?.name || null,
              }
            : null,
          issuer: issuer ? sanitizeUser(issuer) : null,
        };
      });

      // Sort newest first
      populated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json(populated);
    } catch (error: any) {
      console.error('Error fetching issued credentials:', error);
      return res.status(500).json({ message: 'Internal server error while fetching credentials.' });
    }
  }
);

// PATCH /api/credentials/:userId (SUPER_ADMIN only)
credentialsRouter.patch(
  '/:userId',
  requireAuth,
  requireRoles(['SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUser = req.user!;
      const { userId } = req.params;
      const { newPassword } = req.body;

      const targetUser = db.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      let plaintextPassword: string;
      if (typeof newPassword === 'string' && newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }
        plaintextPassword = newPassword.trim();
      } else {
        plaintextPassword = generateStrongPassword(12);
      }

      const passwordHash = await hashPassword(plaintextPassword);
      db.updateUser(userId, { passwordHash });

      db.upsertIssuedCredential({
        userId: targetUser.id,
        email: targetUser.email,
        plaintextPassword,
        createdById: currentUser.id,
      });

      return res.json({
        message: 'Password updated successfully.',
        plaintextPassword,
      });
    } catch (error: any) {
      console.error('Error updating credential password:', error);
      return res.status(500).json({ message: 'Failed to update user password.' });
    }
  }
);
