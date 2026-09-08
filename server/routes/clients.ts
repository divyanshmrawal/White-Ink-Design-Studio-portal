import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';

export const clientsRouter = Router();

// GET /api/clients
clientsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search } = req.query;

  let clients = db.getClients();

  // If role is CLIENT or CLIENT_ADMIN, only show their own client record
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    clients = clients.filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }

  // Attach project count for each client
  const clientsWithStats = clients.map((c) => {
    const clientProjects = db.getProjects().filter((p) => p.clientId === c.id);
    return {
      ...c,
      projectCount: clientProjects.length,
      activeProjectCount: clientProjects.filter((p) => p.status === 'ACTIVE').length,
    };
  });

  return res.json(clientsWithStats);
});

// GET /api/clients/:id
clientsRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  const client = db.getClientById(id);
  if (!client) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  // Access check for Client & Client Admin role
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    if ((!currentUser.clientId || client.id !== currentUser.clientId) && client.email.toLowerCase() !== currentUser.email.toLowerCase() && client.id !== currentUser.id) {
      return res.status(403).json({ message: 'Forbidden: Access to this client record is restricted.' });
    }
  }

  const clientProjects = db.getProjects().filter((p) => p.clientId === id);
  return res.json({
    ...client,
    projects: clientProjects,
  });
});

// POST /api/clients (SUPER_ADMIN and ADMIN)
clientsRouter.post('/', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, company, email, phone, address } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({ message: 'Name, company, and email are required fields.' });
    }

    const existing = db.getClientByEmail(email.trim());
    if (existing) {
      return res.status(409).json({ message: 'A client with this email already exists.' });
    }

    const newClient = db.createClient({
      id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
    });

    return res.status(201).json(newClient);
  } catch (error: any) {
    console.error('Error creating client:', error);
    return res.status(500).json({ message: 'Failed to create client.' });
  }
});

// PATCH /api/clients/:id
clientsRouter.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, company, email, phone, address } = req.body;

    const target = db.getClientById(id);
    if (!target) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
    const isOwnClient =
      (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') &&
      ((currentUser.clientId && target.id === currentUser.clientId) || target.id === currentUser.id || target.email.toLowerCase() === currentUser.email.toLowerCase());
    if (!isAdmin && !isOwnClient) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify this client record.' });
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (company) updates.company = company.trim();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (address !== undefined) updates.address = address ? address.trim() : null;
    if (email) {
      const emailClean = email.trim().toLowerCase();
      if (emailClean !== target.email.toLowerCase()) {
        const existing = db.getClientByEmail(emailClean);
        if (existing && existing.id !== id) {
          return res.status(409).json({ message: 'Email address already in use by another client.' });
        }
        updates.email = emailClean;
      }
    }

    const updated = db.updateClient(id, updates);
    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating client:', error);
    return res.status(500).json({ message: 'Failed to update client.' });
  }
});

// DELETE /api/clients/:id
clientsRouter.delete('/:id', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = db.getClientById(id);
  if (!target) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  const success = db.deleteClient(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete client.' });
  }

  return res.json({ message: 'Client and associated projects deleted successfully.', deletedId: id });
});
