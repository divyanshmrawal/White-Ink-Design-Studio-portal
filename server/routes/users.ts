import { Router, Response } from 'express';
import { db, Role } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser, hashPassword, generateStrongPassword } from '../auth.ts';

export const usersRouter = Router();

// GET /api/users/team-workload
usersRouter.get('/team-workload', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const workload = db.getAllTeamMembersWorkload();
  return res.json(workload);
});

// GET /api/users
usersRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search, role } = req.query;

  let users = db.getUsers();

  // Scoping
  if (currentUser.role === 'CLIENT_ADMIN') {
    // CLIENT_ADMIN: strictly scoped to members of their own client company
    users = users.filter((u) => u.clientId === currentUser.clientId);
  } else if (currentUser.role === 'CLIENT') {
    // Existing CLIENT project-based scoping (untouched)
    const clientProjects = db.getProjects().filter((p) => {
      const client = db.getClientById(p.clientId);
      return (client && client.email.toLowerCase() === currentUser.email.toLowerCase()) || p.clientId === currentUser.id;
    });
    const allowedProjectIds = new Set(clientProjects.map((p) => p.id));
    const allowedUserIds = new Set<string>();

    clientProjects.forEach((p) => allowedUserIds.add(p.createdById));
    db.getAllProjectMembers().forEach((pm) => {
      if (allowedProjectIds.has(pm.projectId)) allowedUserIds.add(pm.userId);
    });
    allowedUserIds.add(currentUser.id);

    users = users.filter((u) => allowedUserIds.has(u.id));
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    users = users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  if (role && typeof role === 'string' && role !== 'ALL') {
    users = users.filter((u) => u.role === role);
  }

  return res.json(users.map(sanitizeUser));
});

// GET /api/users/:id
usersRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  return res.json(sanitizeUser(user));
});

// POST /api/users (Tier 2 direct member creation with auto-generated passwords)
usersRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN', 'CLIENT_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUser = req.user!;
      const { name, email, role, profileImage } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ message: 'Name, email, and role are required.' });
      }

      // Enforce strict tier-2 creation hierarchy:
      let assignedClientId: string | null = null;

      if (currentUser.role === 'ADMIN') {
        if (role !== 'TEAM_MEMBER') {
          return res.status(403).json({
            message: 'Forbidden: Admins can only create Team Member accounts.',
          });
        }
      } else if (currentUser.role === 'CLIENT_ADMIN') {
        if (role !== 'CLIENT') {
          return res.status(403).json({
            message: 'Forbidden: Client Admins can only create Client accounts.',
          });
        }
        if (!currentUser.clientId) {
          return res.status(400).json({
            message: 'Current Client Admin is not linked to a Client company.',
          });
        }
        if (req.body.clientId && req.body.clientId !== currentUser.clientId) {
          return res.status(403).json({
            message: 'Forbidden: Client Admins cannot create users for other client companies.',
          });
        }
        assignedClientId = currentUser.clientId;
      } else {
        return res.status(403).json({ message: 'Forbidden: Direct user creation is restricted to Admins and Client Admins.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = db.getUserByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ message: 'A user with this email address already exists.' });
      }

      // Auto-generate strong password server-side
      const plaintextPassword = generateStrongPassword(12);
      const passwordHash = await hashPassword(plaintextPassword);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newUser = db.createUser({
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: role as Role,
        clientId: assignedClientId,
        profileImage: profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
        mustChangePassword: true,
      });

      // Archive generated credentials in vault
      db.createIssuedCredential({
        userId: newUser.id,
        email: newUser.email,
        plaintextPassword,
        createdById: currentUser.id,
      });

      return res.status(201).json({
        ...sanitizeUser(newUser),
        generatedPassword: plaintextPassword,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      return res.status(500).json({ message: 'Failed to create user.' });
    }
  }
);

// PATCH /api/users/:id
usersRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, email, role, password, profileImage } = req.body;

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isSelf = currentUser.id === id;

    // Strict authorization matrix:
    if (!isSelf) {
      if (currentUser.role === 'SUPER_ADMIN') {
        if (targetUser.role !== 'ADMIN' && targetUser.role !== 'CLIENT_ADMIN') {
          return res.status(403).json({
            message: 'Forbidden: Super Admins can only modify Admin and Client Admin accounts.',
          });
        }
      } else if (currentUser.role === 'ADMIN') {
        if (targetUser.role !== 'TEAM_MEMBER') {
          return res.status(403).json({
            message: 'Forbidden: Admins can only modify Team Member accounts.',
          });
        }
      } else if (currentUser.role === 'CLIENT_ADMIN') {
        if (
          targetUser.role !== 'CLIENT' ||
          !currentUser.clientId ||
          targetUser.clientId !== currentUser.clientId
        ) {
          return res.status(403).json({
            message: 'Forbidden: Client Admins can only modify Client accounts in their own company.',
          });
        }
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot modify other users.' });
      }
    }

    // Role change restrictions:
    if (role && role !== targetUser.role) {
      if (isSelf) {
        return res.status(403).json({ message: 'You cannot change your own role.' });
      }
      if (currentUser.role === 'SUPER_ADMIN') {
        if (role !== 'ADMIN' && role !== 'CLIENT_ADMIN') {
          return res.status(403).json({
            message: 'Forbidden: Super Admins can only assign Admin or Client Admin roles.',
          });
        }
      } else if (currentUser.role === 'ADMIN') {
        if (role !== 'TEAM_MEMBER') {
          return res.status(403).json({
            message: 'Forbidden: Admins can only assign Team Member role.',
          });
        }
      } else if (currentUser.role === 'CLIENT_ADMIN') {
        if (role !== 'CLIENT') {
          return res.status(403).json({
            message: 'Forbidden: Client Admins can only assign Client role.',
          });
        }
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot change user roles.' });
      }
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (email) {
      const emailClean = email.trim().toLowerCase();
      if (emailClean !== targetUser.email.toLowerCase()) {
        const emailTaken = db.getUserByEmail(emailClean);
        if (emailTaken && emailTaken.id !== id) {
          return res.status(409).json({ message: 'Email address already in use.' });
        }
        updates.email = emailClean;
      }
    }
    if (role && role !== targetUser.role) {
      updates.role = role;
    }
    if (profileImage !== undefined) {
      updates.profileImage = profileImage;
    }
    if (password && password.trim().length >= 6) {
      updates.passwordHash = await hashPassword(password);
    }

    const updatedUser = db.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update user.' });
    }

    return res.json(sanitizeUser(updatedUser));
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Failed to update user.' });
  }
});

// DELETE /api/users/:id
usersRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CLIENT_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { id } = req.params;

    if (currentUser.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Strict deletion authorization matrix:
    if (currentUser.role === 'SUPER_ADMIN') {
      if (targetUser.role !== 'ADMIN' && targetUser.role !== 'CLIENT_ADMIN') {
        return res.status(403).json({
          message: 'Forbidden: Super Admins can only delete Admin and Client Admin accounts.',
        });
      }
    } else if (currentUser.role === 'ADMIN') {
      if (targetUser.role !== 'TEAM_MEMBER') {
        return res.status(403).json({
          message: 'Forbidden: Admins can only delete Team Member accounts.',
        });
      }
    } else if (currentUser.role === 'CLIENT_ADMIN') {
      if (
        targetUser.role !== 'CLIENT' ||
        !currentUser.clientId ||
        targetUser.clientId !== currentUser.clientId
      ) {
        return res.status(403).json({
          message: 'Forbidden: Client Admins can only delete Client accounts in their own company.',
        });
      }
    } else {
      return res.status(403).json({ message: 'Forbidden: You cannot delete users.' });
    }

    const success = db.deleteUser(id);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete user.' });
    }

    return res.json({ message: 'User deleted successfully.', deletedId: id });
  }
);
