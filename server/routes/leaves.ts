import { Router, Response } from 'express';
import { db, LeaveType, LeaveStatus } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';

export const leavesRouter = Router();

leavesRouter.use(requireAuth);

// GET / - List leaves (Team members see their own, Admins see all)
leavesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const userId = isAdmin ? (req.query.userId as string | undefined) : req.user!.id;
    const status = req.query.status as LeaveStatus | undefined;

    const leaves = db.getLeaves({ userId, status });
    return res.status(200).json(leaves);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch leaves.' });
  }
});

// GET /:id - Single leave details
leavesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const leave = db.getLeaveById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave record not found.' });
    }

    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isAdmin && leave.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden: You cannot view other members leaves.' });
    }

    return res.status(200).json(leave);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch leave.' });
  }
});

// POST / - Apply for leave (or Admin can apply on behalf of user)
leavesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const { userId, leaveType, startDate, endDate, totalDays, reason, isBackdated } = req.body;

    const targetUserId = (isAdmin && userId) ? userId : req.user!.id;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'leaveType, startDate, endDate, and reason are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const calculatedDays = totalDays || Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const now = new Date();
    const isActuallyBackdated = isBackdated !== undefined ? isBackdated : (start.getTime() < now.setHours(0, 0, 0, 0));

    const leave = db.createLeave({
      userId: targetUserId,
      leaveType: leaveType as LeaveType,
      startDate,
      endDate,
      totalDays: calculatedDays,
      reason,
      isBackdated: isActuallyBackdated,
    });

    return res.status(201).json({ message: 'Leave application submitted successfully.', leave });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to submit leave.' });
  }
});

// PUT /:id/approve - Approve leave (Admin/Super Admin only)
leavesRouter.put('/:id/approve', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const leave = db.approveLeave(req.params.id, req.user!.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave record not found.' });
    }
    return res.status(200).json({ message: 'Leave request approved successfully.', leave });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to approve leave.' });
  }
});

// PUT /:id/reject - Reject leave (Admin/Super Admin only)
leavesRouter.put('/:id/reject', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    const leave = db.rejectLeave(req.params.id, req.user!.id, rejectionReason);
    if (!leave) {
      return res.status(404).json({ message: 'Leave record not found.' });
    }
    return res.status(200).json({ message: 'Leave request rejected.', leave });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to reject leave.' });
  }
});

// DELETE /:id - Cancel/delete pending leave
leavesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const leave = db.getLeaveById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave record not found.' });
    }

    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    if (!isAdmin && leave.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    db.deleteLeave(req.params.id);
    return res.status(200).json({ message: 'Leave request removed.' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to delete leave.' });
  }
});
