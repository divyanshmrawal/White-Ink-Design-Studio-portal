import { Router, Response } from 'express';
import { db, ReviewStatus } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';

export const reviewsRouter = Router();

reviewsRouter.use(requireAuth);

// GET / - List reviews (Team members see their own, Admins see all)
reviewsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const employeeId = isAdmin ? (req.query.employeeId as string | undefined) : req.user!.id;
    const reviewerId = req.query.reviewerId as string | undefined;

    const reviews = db.getPerformanceReviews({ employeeId, reviewerId });
    return res.status(200).json(reviews);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch performance reviews.' });
  }
});

// GET /:id - Single review details
reviewsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const review = db.getPerformanceReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Performance review not found.' });
    }

    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isAdmin && review.employeeId !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden: You cannot view other members reviews.' });
    }

    return res.status(200).json(review);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch review.' });
  }
});

// POST / - Create review (Admin/Super Admin only)
reviewsRouter.post('/', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, reviewPeriod, score, strengths, improvements, notes, status } = req.body;
    if (!employeeId || !reviewPeriod || score === undefined) {
      return res.status(400).json({ message: 'employeeId, reviewPeriod, and score (0-100) are required.' });
    }

    const review = db.createPerformanceReview({
      employeeId,
      reviewerId: req.user!.id,
      reviewPeriod,
      score: Number(score),
      strengths: strengths || '',
      improvements: improvements || '',
      notes: notes || '',
      status: (status as ReviewStatus) || 'PUBLISHED',
    });

    return res.status(201).json({ message: 'Performance review published successfully.', review });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to create review.' });
  }
});

// PUT /:id - Update review (Admin/Super Admin only)
reviewsRouter.put('/:id', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reviewPeriod, score, strengths, improvements, notes, status } = req.body;
    const review = db.updatePerformanceReview(req.params.id, {
      ...(reviewPeriod !== undefined && { reviewPeriod }),
      ...(score !== undefined && { score: Number(score) }),
      ...(strengths !== undefined && { strengths }),
      ...(improvements !== undefined && { improvements }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    });

    if (!review) {
      return res.status(404).json({ message: 'Performance review not found.' });
    }

    return res.status(200).json({ message: 'Performance review updated.', review });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to update review.' });
  }
});

// PUT /:id/acknowledge - Employee acknowledge review
reviewsRouter.put('/:id/acknowledge', (req: AuthenticatedRequest, res: Response) => {
  try {
    const review = db.acknowledgePerformanceReview(req.params.id, req.user!.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found or not owned by you.' });
    }
    return res.status(200).json({ message: 'Performance review acknowledged.', review });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to acknowledge review.' });
  }
});

// DELETE /:id - Delete review (Admin/Super Admin only)
reviewsRouter.delete('/:id', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deletePerformanceReview(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Performance review not found.' });
    }
    return res.status(200).json({ message: 'Performance review deleted.' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to delete review.' });
  }
});
