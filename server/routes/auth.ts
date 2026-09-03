import { Router, Response } from 'express';
import { db, Role } from '../db.ts';
import { hashPassword, comparePassword, generateToken, sanitizeUser, requireAuth, AuthenticatedRequest } from '../auth.ts';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Disallow self-registering as SUPER_ADMIN
    let assignedRole: Role = 'TEAM_MEMBER';
    if (role === 'CLIENT') {
      assignedRole = 'CLIENT';
    } else if (role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Self-registration as SUPER_ADMIN is strictly prohibited.' });
    } else if (role === 'ADMIN') {
      return res.status(403).json({ message: 'Self-registration as ADMIN requires administrator approval.' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email address already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const newUser = db.createUser({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: assignedRole,
      profileImage: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    // If registered as client, auto-create a Client record if one doesn't exist
    if (assignedRole === 'CLIENT') {
      const existingClient = db.getClientByEmail(email);
      if (!existingClient) {
        db.createClient({
          id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          company: `${name.trim()}'s Organization`,
          email: email.trim().toLowerCase(),
        });
      }
    }

    const token = generateToken(newUser);
    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      message: 'Account registered successfully.',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: sanitizeUser(user),
      message: 'Login successful.',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return res.json({
    user: sanitizeUser(req.user),
  });
});
