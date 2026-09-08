import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser } from '../auth.ts';

export const credentialsRouter = Router();

// GET /api/credentials
credentialsRouter.get(
  '/',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CLIENT_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUser = req.user!;
      let credentials = [];

      if (currentUser.role === 'SUPER_ADMIN') {
        // SUPER_ADMIN sees all issued credentials across the system
        credentials = db.getIssuedCredentials();
      } else if (currentUser.role === 'ADMIN' || currentUser.role === 'CLIENT_ADMIN') {
        // ADMIN and CLIENT_ADMIN only see credentials they personally issued/created
        credentials = db.getIssuedCredentials({ createdById: currentUser.id });
      } else {
        return res.status(403).json({ message: 'Forbidden: Access to credentials vault is restricted.' });
      }

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
