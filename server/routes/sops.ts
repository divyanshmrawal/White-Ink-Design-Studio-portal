import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';

export const sopsRouter = Router();

sopsRouter.use(requireAuth);
sopsRouter.use((req: AuthenticatedRequest, res: Response, next) => {
  if (req.user?.role === 'CLIENT' || req.user?.role === 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Standard Operating Procedures are for internal staff only.' });
  }
  next();
});

// GET / - List all SOPs with optional category and search filters
sopsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const sops = db.getSOPs({ category, search });
    return res.status(200).json(sops);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch SOP documents.' });
  }
});

// GET /:id - Single SOP detail
sopsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const sop = db.getSOPById(req.params.id);
    if (!sop) {
      return res.status(404).json({ message: 'SOP document not found.' });
    }
    return res.status(200).json(sop);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch SOP.' });
  }
});

// POST / - Create SOP (Admin/Super Admin only)
sopsRouter.post('/', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, category, content, version, tags } = req.body;
    if (!title || !category || !content) {
      return res.status(400).json({ message: 'title, category, and content are required.' });
    }

    const sop = db.createSOP({
      title,
      category,
      content,
      version: version || '1.0',
      tags: tags || '',
      createdById: req.user!.id,
    });

    return res.status(201).json({ message: 'SOP document created successfully.', sop });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to create SOP.' });
  }
});

// PUT /:id - Update SOP (Admin/Super Admin only)
sopsRouter.put('/:id', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, category, content, version, tags } = req.body;
    const sop = db.updateSOP(
      req.params.id,
      {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(content !== undefined && { content }),
        ...(version !== undefined && { version }),
        ...(tags !== undefined && { tags }),
      },
      req.user!.id
    );

    if (!sop) {
      return res.status(404).json({ message: 'SOP document not found.' });
    }

    return res.status(200).json({ message: 'SOP document updated.', sop });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to update SOP.' });
  }
});

// DELETE /:id - Delete SOP (Admin/Super Admin only)
sopsRouter.delete('/:id', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteSOP(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ message: 'SOP document not found.' });
    }
    return res.status(200).json({ message: 'SOP document deleted.' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to delete SOP.' });
  }
});
