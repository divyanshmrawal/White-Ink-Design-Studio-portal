import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import { db } from '../db.ts';
import {
  createGoogleMeeting,
  updateGoogleMeeting,
  cancelGoogleMeeting,
} from '../services/google/calendar.ts';
import { sanitizeErrorMessage } from '../services/google/crypto.ts';
import { sendMeetingScheduledEmail, sendMeetingCancelledEmail } from '../email.ts';

export const meetingsRouter = Router();

meetingsRouter.use(requireAuth);

/**
 * Helper to verify user authorization for a project's meeting
 */
function isUserAuthorizedForProjectMeetings(user: any, projectId: string): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;

  const project = db.getProjectById(projectId);
  if (!project) return false;

  if (user.role === 'TEAM_MEMBER') {
    return (
      db.getProjectMembers(projectId).some((pm) => pm.userId === user.id) ||
      project.createdById === user.id
    );
  }

  if (user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN') {
    const client = db.getClientById(project.clientId);
    return Boolean(
      (user.clientId && client && client.id === user.clientId) ||
      (client && client.email.toLowerCase() === user.email.toLowerCase()) ||
      project.clientId === user.id
    );
  }

  return false;
}

/**
 * GET /api/projects/:projectId/meetings — List meetings for an authorized project
 */
meetingsRouter.get('/projects/:projectId/meetings', (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const user = req.user!;

  const project = db.getProjectById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  if (!isUserAuthorizedForProjectMeetings(user, projectId)) {
    return res.status(403).json({ message: 'Forbidden: Access to this project meetings is restricted.' });
  }

  const meetings = db.getMeetings(projectId).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return res.json(meetings);
});

/**
 * POST /api/projects/:projectId/meetings — Schedule a new meeting for a project
 */
meetingsRouter.post('/projects/:projectId/meetings', async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const { title, description, startTime, endTime, attendeeEmails, timeZone } = req.body;
  const user = req.user!;

  if (!title?.trim() || !startTime || !endTime) {
    return res.status(400).json({ message: 'Title, startTime, and endTime are required.' });
  }

  const startParsed = new Date(startTime);
  const endParsed = new Date(endTime);
  if (isNaN(startParsed.getTime()) || isNaN(endParsed.getTime())) {
    return res.status(400).json({ message: 'Invalid startTime or endTime date format.' });
  }
  if (endParsed <= startParsed) {
    return res.status(400).json({ message: 'endTime must be strictly after startTime.' });
  }

  const project = db.getProjectById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  if (!isUserAuthorizedForProjectMeetings(user, projectId)) {
    return res.status(403).json({ message: 'Forbidden: You are not authorized to schedule meetings for this project.' });
  }

  // Gather attendee emails
  const emails: string[] = Array.isArray(attendeeEmails) ? attendeeEmails.filter(Boolean) : [];
  const client = db.getClientById(project.clientId);
  if (client?.email && !emails.includes(client.email)) {
    emails.push(client.email);
  }
  if (user.email && !emails.includes(user.email)) {
    emails.push(user.email);
  }

  const result = await createGoogleMeeting({
    projectId,
    title: title.trim(),
    description: description ? description.trim() : undefined,
    startTime: startParsed.toISOString(),
    endTime: endParsed.toISOString(),
    attendeeEmails: emails,
    timeZone,
  });

  // Log activity
  db.logActivity({
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    action: 'MEETING_SCHEDULED',
    entityType: 'PROJECT',
    entityId: projectId,
    details: JSON.stringify({
      meetingTitle: title.trim(),
      startTime: startParsed.toISOString(),
      meetLink: result.meetLink,
    }),
  });

  // Notify project members and client
  const clientUser = client
    ? db.getUsers().find((u) => u.clientId === client.id || u.email.toLowerCase() === client.email.toLowerCase())
    : null;

  if (clientUser && clientUser.id !== user.id) {
    db.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: clientUser.id,
      title: 'New Project Meeting Scheduled',
      message: `${user.name} scheduled a meeting "${title.trim()}" for project "${project.name}".`,
      type: 'GENERAL',
      linkUrl: `/projects/${projectId}`,
      isRead: false,
    });
  }

  // Dispatch transactional email to client and invited attendees asynchronously
  const recipientEmails = new Set<string>();
  if (client?.email) recipientEmails.add(client.email.toLowerCase());
  if (clientUser?.email) recipientEmails.add(clientUser.email.toLowerCase());
  emails.forEach((e) => {
    if (e.includes('@') && e.toLowerCase() !== user.email?.toLowerCase()) {
      recipientEmails.add(e.toLowerCase());
    }
  });

  for (const recipientEmail of recipientEmails) {
    sendMeetingScheduledEmail({
      toEmail: recipientEmail,
      recipientName: recipientEmail === client?.email ? (client.name || 'Valued Client') : 'Project Member',
      meetingTitle: title.trim(),
      projectName: project.name,
      startTime: startParsed.toISOString(),
      endTime: endParsed.toISOString(),
      meetLink: result.meetLink,
      description: description ? description.trim() : null,
    }).catch((emailErr) => console.warn('[EMAIL] Meeting invite email dispatch failed:', emailErr?.message));
  }

  return res.status(201).json({
    message: result.success ? 'Meeting scheduled with Google Meet.' : 'Meeting scheduled (internal fallback).',
    meeting: result.meeting,
    meetLink: result.meetLink,
    calendarEventId: result.calendarEventId,
  });
});

/**
 * PATCH /api/meetings/:id or /api/projects/:projectId/meetings/:meetingId — Update an existing meeting
 */
meetingsRouter.patch(['/meetings/:id', '/projects/:projectId/meetings/:meetingId'], async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.meetingId || req.params.id;
  const { title, description, startTime, endTime, status, timeZone } = req.body;
  const user = req.user!;

  const meeting = db.getMeetingById(id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });

  if (!isUserAuthorizedForProjectMeetings(user, meeting.projectId)) {
    return res.status(403).json({ message: 'Forbidden: You cannot modify this meeting.' });
  }

  let startIso: string | undefined;
  let endIso: string | undefined;

  if (startTime) {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid startTime format.' });
    startIso = d.toISOString();
  }

  if (endTime) {
    const d = new Date(endTime);
    if (isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid endTime format.' });
    endIso = d.toISOString();
  }

  if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
    return res.status(400).json({ message: 'endTime must be strictly after startTime.' });
  }

  const result = await updateGoogleMeeting(id, {
    ...(title && { title: title.trim() }),
    ...(description !== undefined && { description: description ? description.trim() : null }),
    ...(startIso && { startTime: startIso }),
    ...(endIso && { endTime: endIso }),
    ...(status && { status }),
    timeZone,
  });

  db.logActivity({
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    action: 'MEETING_UPDATED',
    entityType: 'PROJECT',
    entityId: meeting.projectId,
    details: `Updated meeting "${title ? title.trim() : meeting.title}"`,
  });

  return res.json({
    success: result.success,
    meeting: result.meeting || db.getMeetingById(id),
    message: 'Meeting updated successfully.',
  });
});

/**
 * DELETE /api/meetings/:id or /api/projects/:projectId/meetings/:meetingId — Cancel an existing meeting
 */
meetingsRouter.delete(['/meetings/:id', '/projects/:projectId/meetings/:meetingId'], async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.meetingId || req.params.id;
  const user = req.user!;

  const meeting = db.getMeetingById(id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found.' });

  if (!isUserAuthorizedForProjectMeetings(user, meeting.projectId)) {
    return res.status(403).json({ message: 'Forbidden: You cannot cancel this meeting.' });
  }

  const result = await cancelGoogleMeeting(id);
  const updated = db.getMeetingById(id);

  db.logActivity({
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    action: 'MEETING_CANCELLED',
    entityType: 'PROJECT',
    entityId: meeting.projectId,
    details: `Cancelled meeting "${meeting.title}"`,
  });

  // Dispatch cancellation email to client
  const project = db.getProjectById(meeting.projectId);
  const client = project ? db.getClientById(project.clientId) : null;
  if (client?.email) {
    sendMeetingCancelledEmail({
      toEmail: client.email,
      recipientName: client.name || 'Valued Client',
      meetingTitle: meeting.title,
      projectName: project?.name || 'Project',
      startTime: meeting.startTime,
    }).catch((emailErr) => console.warn('[EMAIL] Meeting cancellation email dispatch failed:', emailErr?.message));
  }

  return res.json({
    message: 'Meeting cancelled successfully.',
    meeting: updated,
    success: result.success,
  });
});
