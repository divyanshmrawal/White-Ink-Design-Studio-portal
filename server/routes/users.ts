import { Router, Response } from 'express';
import { db, Role } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser, hashPassword } from '../auth.ts';

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

  // If Client, only allow viewing team members & admins for their projects
  if (currentUser.role === 'CLIENT') {
    const clientProjects = db.getProjects().filter((p) => {
      const client = db.getClientById(p.clientId);
      return (client && client.email.toLowerCase() === currentUser.email.toLowerCase()) || p.clientId === currentUser.id;
    });
    const allowedProjectIds = new Set(clientProjects.map((p) => p.id));
    const allowedUserIds = new Set<string>();
    
    // Add managers / creators
    clientProjects.forEach((p) => allowedUserIds.add(p.createdById));
    // Add project members
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

// POST /api/users (SUPER_ADMIN and ADMIN)
usersRouter.post('/', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { name, email, password, role, profileImage } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }

    // Role restrictions: ADMIN cannot create SUPER_ADMIN
    if (currentUser.role === 'ADMIN' && role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Admins cannot create Super Admin accounts.' });
    }

    const existing = db.getUserByEmail(email.trim());
    if (existing) {
      return res.status(409).json({ message: 'A user with this email address already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newUser = db.createUser({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: role as Role,
      profileImage: profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    if (role === 'CLIENT') {
      const existingClient = db.getClientByEmail(email);
      if (!existingClient) {
        db.createClient({
          id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          company: `${name.trim()}'s Company`,
          email: email.trim().toLowerCase(),
        });
      }
    }

    return res.status(201).json(sanitizeUser(newUser));
  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Failed to create user.' });
  }
});

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

    // Authorization checks
    const isSelf = currentUser.id === id;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isSelf && !isSuperAdmin && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify other users.' });
    }

    // ADMIN cannot edit SUPER_ADMIN accounts (unless self)
    if (isAdmin && !isSuperAdmin && targetUser.role === 'SUPER_ADMIN' && !isSelf) {
      return res.status(403).json({ message: 'Admins cannot modify Super Admin accounts.' });
    }

    // ADMIN cannot escalate role to SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && !isSuperAdmin) {
      return res.status(403).json({ message: 'Only Super Admins can grant Super Admin role.' });
    }

    // Non-admins cannot change their own role
    if (isSelf && !isSuperAdmin && !isAdmin && role && role !== targetUser.role) {
      return res.status(403).json({ message: 'You cannot change your own role.' });
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
    if (role && (isSuperAdmin || isAdmin)) {
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
usersRouter.delete('/:id', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  if (currentUser.id === id) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  const targetUser = db.getUserById(id);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (currentUser.role === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Admins cannot delete Super Admin accounts.' });
  }

  const success = db.deleteUser(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete user.' });
  }

  return res.json({ message: 'User deleted successfully.', deletedId: id });
});
