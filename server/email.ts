import { sendGmailMessage } from './services/google/gmail.ts';

export interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  category: string;
  sentAt: string;
  status: 'DELIVERED' | 'FALLBACK_LOGGED';
  previewText: string;
}

const sentEmailsLog: SentEmailRecord[] = [];

/**
 * Base email dispatcher that sends via Gmail API when connected,
 * falling back gracefully to server observability log without crashing.
 */
async function dispatchEmail(params: {
  to: string;
  subject: string;
  plainText: string;
  html: string;
  category: string;
  previewText: string;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { to, subject, plainText, html, category, previewText } = params;

  // Basic recipient validation to avoid arbitrary relay abuse
  if (!to || !to.includes('@') || to.length < 5) {
    console.warn(`[EMAIL SERVICE] Invalid recipient address: ${to}`);
    return {
      success: false,
      emailRecord: {
        id: `email_${Date.now()}`,
        to,
        subject,
        category,
        sentAt: new Date().toISOString(),
        status: 'FALLBACK_LOGGED',
        previewText: 'Invalid recipient',
      },
    };
  }

  const emailRecord: SentEmailRecord = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to,
    subject,
    category,
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
    previewText,
  };

  sentEmailsLog.push(emailRecord);

  // Formatted console output for server activity observability
  console.log('\n======================================================================');
  console.log(`[TRANSACTIONAL EMAIL] 📨 ${category}: ${subject}`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Preview: ${previewText}`);
  console.log('----------------------------------------------------------------------');

  try {
    const gmailRes = await sendGmailMessage({
      to,
      subject,
      text: plainText,
      html,
    });

    if (gmailRes.success) {
      console.log(`[GMAIL API] Dispatched successfully (Message ID: ${gmailRes.messageId})`);
    } else {
      emailRecord.status = 'FALLBACK_LOGGED';
      console.log(`[GMAIL API] Sent via local fallback log (${gmailRes.error || 'Google not connected'})`);
    }
  } catch (err: any) {
    emailRecord.status = 'FALLBACK_LOGGED';
    console.warn(`[GMAIL API] Dispatch unavailable, preserved in portal log:`, err?.message);
  }

  return { success: true, emailRecord };
}

/**
 * Reusable HTML Email Template Wrapper matching White Ink Design Studio / PlanForge theme
 */
function wrapEmailHtml(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f8f8f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e1e1e; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e2d6; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 28px; background: linear-gradient(135deg, #2a2825 0%, #171614 100%); border-bottom: 2px solid #8e7028;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #f5f0e1; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">
                WHITE INK <span style="color: #c5a059; font-weight: 400;">| PlanForge Portal</span>
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 28px;">
        <h2 style="margin-top: 0; margin-bottom: 16px; color: #1a1918; font-size: 18px; font-weight: 700;">${title}</h2>
        ${contentHtml}
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 28px; background-color: #faf9f6; border-top: 1px solid #ece7dc; font-size: 11px; color: #8c867a; text-align: center;">
        <p style="margin: 0 0 6px 0;">This is an automated transactional message from White Ink Design Studio Portal.</p>
        <p style="margin: 0;">Please do not reply directly to this email if unmonitored. Access your project in the portal to manage notifications.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/* ========================================================================== */
/* 1. Client Project Request / Creation Confirmation                          */
/* ========================================================================== */

export interface ProjectConfirmationEmailOptions {
  toEmail: string;
  clientName: string;
  projectName: string;
  projectDescription?: string | null;
  preferredMeetingTime: string;
  meetingLink: string;
  leadOwnerName?: string;
  companyName?: string;
}

export async function sendClientProjectConfirmationEmail(
  options: ProjectConfirmationEmailOptions
): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const {
    toEmail,
    clientName,
    projectName,
    projectDescription,
    preferredMeetingTime,
    meetingLink,
    leadOwnerName,
    companyName,
  } = options;

  const formattedDate = new Date(preferredMeetingTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const subject = `Project Request Received: ${projectName} — Kick-off Meeting Details`;
  const previewText = `Your project request "${projectName}" was received. Kick-off scheduled for ${formattedDate}.`;

  const plainText = `
Hello ${clientName},

Your project request "${projectName}" has been received and initialized in our portal.

PROJECT SUMMARY:
--------------------------------------------------
Project Name: ${projectName}
${projectDescription ? `Scope: ${projectDescription}\n` : ''}${companyName ? `Client: ${companyName}\n` : ''}${leadOwnerName ? `Assigned Lead: ${leadOwnerName}\n` : ''}Status: Pending Setup

KICK-OFF MEETING DETAILS:
--------------------------------------------------
Scheduled Time: ${formattedDate}
Meeting Join Link: ${meetingLink || 'To be shared prior to discussion'}

Thank you for partnering with White Ink / PlanForge!

Best regards,
The Operations & Delivery Team
White Ink Design Studio
  `.trim();

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${clientName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">Your project request <strong>"${projectName}"</strong> has been successfully submitted and initialized.</p>
    
    <div style="background-color: #fbfaf6; border: 1px solid #e7dfcb; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: #8e7028; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Project Summary</h3>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Project Name:</strong> ${projectName}</p>
      ${projectDescription ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Scope:</strong> ${projectDescription}</p>` : ''}
      ${companyName ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Client:</strong> ${companyName}</p>` : ''}
      ${leadOwnerName ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Assigned Lead:</strong> ${leadOwnerName}</p>` : ''}
    </div>

    <div style="background-color: #f5f8ff; border: 1px solid #ccd9f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Kick-off Meeting Information</h3>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Scheduled Date & Time:</strong> ${formattedDate}</p>
      ${
        meetingLink
          ? `<p style="margin: 12px 0 0 0;"><a href="${meetingLink}" style="display: inline-block; background-color: #8e7028; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Join Google Meet</a></p>`
          : `<p style="margin: 4px 0; font-size: 13px; color: #666;">Meeting link will be shared prior to the session.</p>`
      }
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Project Request Received: ${projectName}`, htmlContent),
    category: 'PROJECT_CONFIRMATION',
    previewText,
  });
}

/* ========================================================================== */
/* 2. Project Status Changes Notification                                      */
/* ========================================================================== */

export async function sendProjectStatusChangedEmail(options: {
  toEmail: string;
  recipientName: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  projectId: string;
  note?: string | null;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { toEmail, recipientName, projectName, oldStatus, newStatus, projectId, note } = options;

  const subject = `Project Status Update: ${projectName} is now ${newStatus.replace('_', ' ')}`;
  const previewText = `The status of "${projectName}" has changed from ${oldStatus} to ${newStatus}.`;

  const plainText = `
Hello ${recipientName},

The status of project "${projectName}" has been updated:

Previous Status: ${oldStatus.replace('_', ' ')}
New Status:      ${newStatus.replace('_', ' ')}
${note ? `\nNotes: ${note}\n` : ''}
You can review the updated project timeline and deliverables in the portal.

Best regards,
White Ink Portal Team
  `.trim();

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${recipientName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">The status of project <strong>"${projectName}"</strong> has been updated.</p>

    <div style="background-color: #fbfaf6; border: 1px solid #e7dfcb; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 13px;"><strong>Previous Status:</strong> ${oldStatus.replace('_', ' ')}</p>
      <p style="margin: 6px 0; font-size: 15px; color: #8e7028;"><strong>New Status:</strong> <span style="background-color: #f3ede0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${newStatus.replace('_', ' ')}</span></p>
      ${note ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: #555;"><strong>Update Note:</strong> ${note}</p>` : ''}
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Project Status Update: ${projectName}`, htmlContent),
    category: 'PROJECT_STATUS',
    previewText,
  });
}

/* ========================================================================== */
/* 3. Meeting Scheduled, Updated, and Cancelled Notifications                  */
/* ========================================================================== */

export async function sendMeetingScheduledEmail(options: {
  toEmail: string;
  recipientName: string;
  meetingTitle: string;
  projectName: string;
  startTime: string;
  endTime: string;
  meetLink?: string | null;
  description?: string | null;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { toEmail, recipientName, meetingTitle, projectName, startTime, endTime, meetLink, description } = options;

  const startDate = new Date(startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTimeStr = new Date(endTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const subject = `Meeting Invitation: ${meetingTitle} (${projectName})`;
  const previewText = `New meeting scheduled for "${projectName}" on ${startDate}.`;

  const plainText = `
Hello ${recipientName},

A new project meeting has been scheduled:

Meeting:   ${meetingTitle}
Project:   ${projectName}
Time:      ${startDate} – ${endTimeStr}
${meetLink ? `Join Link: ${meetLink}\n` : ''}${description ? `Agenda:    ${description}\n` : ''}
Please join promptly at the scheduled time.

Best regards,
White Ink Portal Team
  `.trim();

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${recipientName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">You have been invited to a project meeting for <strong>"${projectName}"</strong>.</p>

    <div style="background-color: #fbfaf6; border: 1px solid #e7dfcb; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin-top: 0; margin-bottom: 10px; color: #1a1918; font-size: 15px;">${meetingTitle}</h3>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Project:</strong> ${projectName}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Date & Time:</strong> ${startDate} – ${endTimeStr}</p>
      ${description ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #555;"><strong>Agenda:</strong> ${description}</p>` : ''}
    </div>

    ${
      meetLink
        ? `<p style="margin: 16px 0;"><a href="${meetLink}" style="display: inline-block; background-color: #8e7028; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Join Google Meet</a></p>`
        : `<p style="font-size: 12px; color: #777;">Google Meet link will be provided in the portal prior to the meeting.</p>`
    }
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Meeting Invitation: ${meetingTitle}`, htmlContent),
    category: 'MEETING_SCHEDULED',
    previewText,
  });
}

export async function sendMeetingCancelledEmail(options: {
  toEmail: string;
  recipientName: string;
  meetingTitle: string;
  projectName: string;
  startTime: string;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { toEmail, recipientName, meetingTitle, projectName, startTime } = options;

  const dateStr = new Date(startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `Cancelled: ${meetingTitle} (${projectName})`;
  const previewText = `The meeting "${meetingTitle}" scheduled for ${dateStr} has been cancelled.`;

  const plainText = `
Hello ${recipientName},

The following project meeting has been cancelled:

Meeting: ${meetingTitle}
Project: ${projectName}
Original Time: ${dateStr}

If a reschedule is required, an updated invite will be sent.

Best regards,
White Ink Portal Team
  `.trim();

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${recipientName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">Please note that the following meeting has been <strong style="color: #dc2626;">CANCELLED</strong>.</p>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin-top: 0; margin-bottom: 8px; color: #991b1b; font-size: 15px;">${meetingTitle}</h3>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Project:</strong> ${projectName}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Original Time:</strong> ${dateStr}</p>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Meeting Cancelled: ${meetingTitle}`, htmlContent),
    category: 'MEETING_CANCELLED',
    previewText,
  });
}

/* ========================================================================== */
/* 4. Client Review & Revision Requests                                       */
/* ========================================================================== */

export async function sendTaskSubmittedForReviewEmail(options: {
  toEmail: string;
  clientName: string;
  taskTitle: string;
  projectName: string;
  submissionDescription?: string;
  deliverableUrl?: string | null;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { toEmail, clientName, taskTitle, projectName, submissionDescription, deliverableUrl } = options;

  const subject = `Deliverable Ready for Review: ${taskTitle} (${projectName})`;
  const previewText = `Work on "${taskTitle}" is complete and ready for your sign-off.`;

  const plainText = `
Hello ${clientName},

The deliverable "${taskTitle}" for project "${projectName}" has reached 100% completion and was submitted for your approval.

${submissionDescription ? `Submission Notes:\n${submissionDescription}\n\n` : ''}${deliverableUrl ? `Deliverable Asset: ${deliverableUrl}\n\n` : ''}Please log in to the portal to review and approve or request revisions.

Best regards,
White Ink Delivery Team
  `.trim();

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${clientName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">A deliverable in project <strong>"${projectName}"</strong> has been completed and submitted for your review.</p>

    <div style="background-color: #fbfaf6; border: 1px solid #e7dfcb; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin-top: 0; margin-bottom: 8px; color: #8e7028; font-size: 15px;">${taskTitle}</h3>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Project:</strong> ${projectName}</p>
      ${submissionDescription ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #555;"><strong>Summary:</strong> ${submissionDescription}</p>` : ''}
    </div>

    ${
      deliverableUrl
        ? `<p style="margin: 16px 0;"><a href="${deliverableUrl}" style="display: inline-block; background-color: #8e7028; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">View Deliverable Asset</a></p>`
        : ''
    }
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Deliverable Ready: ${taskTitle}`, htmlContent),
    category: 'TASK_SUBMITTED_REVIEW',
    previewText,
  });
}

export async function sendRevisionRequestedEmail(options: {
  toEmail: string;
  teamMemberName: string;
  taskTitle: string;
  projectName: string;
  clientName: string;
  feedback: string;
  priority: string;
  targetDate?: string | null;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { toEmail, teamMemberName, taskTitle, projectName, clientName, feedback, priority, targetDate } = options;

  const subject = `Revision Requested [${priority}]: ${taskTitle} (${projectName})`;
  const previewText = `${clientName} requested revisions on "${taskTitle}".`;

  const plainText = `
Hello ${teamMemberName},

The client (${clientName}) has requested revisions on deliverable "${taskTitle}" in project "${projectName}".

Priority:    ${priority}
${targetDate ? `Target Date: ${targetDate}\n` : ''}
Feedback:
--------------------------------------------------
${feedback}
--------------------------------------------------

Please check the project workspace in the portal to review full details and update the deliverable.

Best regards,
White Ink Portal Team
  `.trim();

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${teamMemberName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">Client <strong>${clientName}</strong> has requested revisions on deliverable <strong>"${taskTitle}"</strong>.</p>

    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 13px;"><strong>Project:</strong> ${projectName}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Priority:</strong> <span style="color: #b45309; font-weight: bold;">${priority}</span></p>
      ${targetDate ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Target Date:</strong> ${targetDate}</p>` : ''}
      <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #fef3c7;">
        <strong style="font-size: 13px; color: #92400e;">Client Feedback:</strong>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #78350f; font-style: italic;">"${feedback}"</p>
      </div>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Revision Requested: ${taskTitle}`, htmlContent),
    category: 'REVISION_REQUESTED',
    previewText,
  });
}

/* ========================================================================== */
/* 5. Client Sign-Off / Approval Decision                                     */
/* ========================================================================== */

export async function sendApprovalDecisionEmail(options: {
  toEmail: string;
  recipientName: string;
  itemTitle: string;
  projectName: string;
  decision: 'APPROVED' | 'REJECTED';
  clientName: string;
  comments?: string | null;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { toEmail, recipientName, itemTitle, projectName, decision, clientName, comments } = options;

  const subject = `Deliverable ${decision === 'APPROVED' ? 'Approved' : 'Requires Changes'}: ${itemTitle} (${projectName})`;
  const previewText = `${clientName} has marked "${itemTitle}" as ${decision}.`;

  const plainText = `
Hello ${recipientName},

Client ${clientName} has resolved the sign-off for "${itemTitle}" in project "${projectName}":

Decision: ${decision}
${comments ? `Comments: ${comments}\n` : ''}
Best regards,
White Ink Portal Team
  `.trim();

  const isApproved = decision === 'APPROVED';

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${recipientName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">Client <strong>${clientName}</strong> has completed review on deliverable <strong>"${itemTitle}"</strong>.</p>

    <div style="background-color: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isApproved ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin-top: 0; margin-bottom: 8px; color: ${isApproved ? '#166534' : '#991b1b'}; font-size: 15px;">
        ${isApproved ? 'Approved by Client' : 'Changes Requested by Client'}
      </h3>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Project:</strong> ${projectName}</p>
      ${comments ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #555;"><strong>Comments:</strong> "${comments}"</p>` : ''}
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Deliverable Sign-Off: ${itemTitle}`, htmlContent),
    category: 'APPROVAL_DECISION',
    previewText,
  });
}

/* ========================================================================== */
/* 6. User Account Credentials / Security Notifications                        */
/* ========================================================================== */

export async function sendUserWelcomeCredentialsEmail(options: {
  toEmail: string;
  userName: string;
  role: string;
  plaintextPassword?: string;
  loginUrl?: string;
}): Promise<{ success: boolean; emailRecord: SentEmailRecord }> {
  const { toEmail, userName, role, plaintextPassword, loginUrl } = options;

  const subject = `Welcome to White Ink / PlanForge Portal — Account Credentials`;
  const previewText = `Your account has been created with role ${role.replace('_', ' ')}.`;

  const plainText = `
Hello ${userName},

An account has been created for you on the White Ink Design Studio / PlanForge Portal.

Your Account Details:
--------------------------------------------------
Login Email: ${toEmail}
Role:        ${role.replace('_', ' ')}
${plaintextPassword ? `Password:    ${plaintextPassword}\n` : ''}
${loginUrl ? `Portal URL:   ${loginUrl}\n` : ''}
For security reasons, please log in and change your password upon your first sign in.

Best regards,
White Ink Administration
  `.trim();

  const htmlContent = `
    <p style="font-size: 14px; color: #333;">Hello <strong>${userName}</strong>,</p>
    <p style="font-size: 14px; color: #444;">Welcome to White Ink Design Studio! An account has been created for you on the portal.</p>

    <div style="background-color: #fbfaf6; border: 1px solid #e7dfcb; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin-top: 0; margin-bottom: 10px; color: #8e7028; font-size: 14px; text-transform: uppercase;">Access Credentials</h3>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Login Email:</strong> ${toEmail}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Role:</strong> ${role.replace('_', ' ')}</p>
      ${plaintextPassword ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Temporary Password:</strong> <code style="background-color: #f3ede0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${plaintextPassword}</code></p>` : ''}
    </div>

    <p style="font-size: 12px; color: #777;">Please change your password immediately after logging in.</p>
  `;

  return dispatchEmail({
    to: toEmail,
    subject,
    plainText,
    html: wrapEmailHtml(`Welcome to White Ink Portal`, htmlContent),
    category: 'USER_WELCOME',
    previewText,
  });
}

/**
 * Returns the history of dispatched automated emails for testing/debugging.
 */
export function getSentEmailsLog(): SentEmailRecord[] {
  return [...sentEmailsLog];
}
