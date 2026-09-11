import { google } from 'googleapis';
import { getAuthenticatedClient } from './auth.ts';
import { sanitizeErrorMessage } from './crypto.ts';
import { db, MeetingRecord } from '../../db.ts';

export interface CreateMeetingParams {
  projectId: string;
  title: string;
  description?: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  attendeeEmails?: string[];
  timeZone?: string;
  requestId?: string;
}

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

/**
 * Creates a Google Calendar event with dynamic Google Meet video conference link.
 * Persists the Meeting record and updates Project.meetingLink & Project.calendarEventId.
 */
export async function createGoogleMeeting(params: CreateMeetingParams): Promise<{
  success: boolean;
  meeting?: MeetingRecord;
  meetLink?: string;
  calendarEventId?: string;
  error?: string;
}> {
  const { projectId, title, description, startTime, endTime, attendeeEmails, timeZone } = params;
  const tz = timeZone || DEFAULT_TIMEZONE;

  const authRes = await getAuthenticatedClient();
  if (!authRes.success) {
    // If Google is disconnected, gracefully record an internal Meeting with fallback link
    const fallbackLink = db.getMeetingLink();
    const meeting = db.createMeeting({
      projectId,
      title,
      description: description || null,
      startTime,
      endTime,
      calendarEventId: null,
      meetLink: fallbackLink,
      status: 'SCHEDULED',
    });

    db.updateProject(projectId, {
      meetingLink: fallbackLink,
    });

    return {
      success: false,
      meeting,
      meetLink: fallbackLink,
      error: authRes.message,
    };
  }

  const calendar = google.calendar({ version: 'v3', auth: authRes.oauth2Client });
  const integration = db.getGoogleIntegration();
  const calendarId = integration.calendarId || 'primary';

  try {
    const reqId = params.requestId || `meet_req_${projectId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        description: description || `Meeting for project in White Ink Portal`,
        start: {
          dateTime: startTime,
          timeZone: tz,
        },
        end: {
          dateTime: endTime,
          timeZone: tz,
        },
        attendees: attendeeEmails?.filter(Boolean).map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: reqId,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      },
    });

    const calendarEventId = event.data.id || undefined;
    const meetLink =
      event.data.hangoutLink ||
      event.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ||
      undefined;

    const meeting = db.createMeeting({
      projectId,
      title,
      description: description || null,
      startTime,
      endTime,
      calendarEventId: calendarEventId || null,
      meetLink: meetLink || null,
      status: 'SCHEDULED',
    });

    db.updateProject(projectId, {
      meetingLink: meetLink || null,
      calendarEventId: calendarEventId || null,
    });

    return {
      success: true,
      meeting,
      meetLink,
      calendarEventId,
    };
  } catch (err: any) {
    console.error('Failed to create Google Calendar event with Meet conference:', err?.message || err);

    // Graceful fallback: still create the Meeting in database with static fallback
    const fallbackLink = db.getMeetingLink();
    const meeting = db.createMeeting({
      projectId,
      title,
      description: description || null,
      startTime,
      endTime,
      calendarEventId: null,
      meetLink: fallbackLink,
      status: 'SCHEDULED',
    });

    db.updateProject(projectId, {
      meetingLink: fallbackLink,
    });

    return {
      success: false,
      meeting,
      meetLink: fallbackLink,
      error: sanitizeErrorMessage(err),
    };
  }
}

/**
 * Updates a scheduled meeting in Google Calendar and the database.
 */
export async function updateGoogleMeeting(
  meetingId: string,
  updates: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    timeZone?: string;
    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  }
): Promise<{ success: boolean; meeting?: MeetingRecord | null; error?: string }> {
  const meeting = db.getMeetingById(meetingId);
  if (!meeting) return { success: false, error: 'Meeting not found.' };

  const tz = updates.timeZone || DEFAULT_TIMEZONE;

  if (meeting.calendarEventId) {
    const authRes = await getAuthenticatedClient();
    if (authRes.success) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: authRes.oauth2Client });
        const integration = db.getGoogleIntegration();
        const calendarId = integration.calendarId || 'primary';

        const requestBody: any = {};
        if (updates.title) requestBody.summary = updates.title;
        if (updates.description !== undefined) requestBody.description = updates.description;
        if (updates.startTime) requestBody.start = { dateTime: updates.startTime, timeZone: tz };
        if (updates.endTime) requestBody.end = { dateTime: updates.endTime, timeZone: tz };

        if (Object.keys(requestBody).length > 0) {
          await calendar.events.patch({
            calendarId,
            eventId: meeting.calendarEventId,
            requestBody,
          });
        }
      } catch (err) {
        console.warn('Could not update event in Google Calendar:', err);
      }
    }
  }

  const updated = db.updateMeeting(meetingId, updates);
  return { success: true, meeting: updated };
}

/**
 * Cancels a scheduled meeting in Google Calendar and updates status to CANCELLED in database.
 */
export async function cancelGoogleMeeting(meetingId: string): Promise<{ success: boolean; error?: string }> {
  const meeting = db.getMeetingById(meetingId);
  if (!meeting) return { success: false, error: 'Meeting not found.' };

  if (meeting.calendarEventId) {
    const authRes = await getAuthenticatedClient();
    if (authRes.success) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: authRes.oauth2Client });
        const integration = db.getGoogleIntegration();
        const calendarId = integration.calendarId || 'primary';

        await calendar.events.delete({
          calendarId,
          eventId: meeting.calendarEventId,
        });
      } catch (err) {
        console.warn('Could not delete event from Google Calendar:', err);
      }
    }
  }

  db.updateMeeting(meetingId, { status: 'CANCELLED' });

  // If project's active meeting was this meeting, check for another active scheduled meeting
  const project = db.getProjectById(meeting.projectId);
  if (project && project.calendarEventId === meeting.calendarEventId) {
    const remainingActive = db
      .getMeetings(meeting.projectId)
      .find((m) => m.id !== meetingId && m.status === 'SCHEDULED');
    db.updateProject(meeting.projectId, {
      meetingLink: remainingActive?.meetLink || null,
      calendarEventId: remainingActive?.calendarEventId || null,
    });
  }

  return { success: true };
}
