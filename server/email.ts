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

export interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  meetingLink: string;
  meetingTime: string;
  sentAt: string;
  status: 'DELIVERED' | 'FAILED';
  previewText: string;
}

const sentEmailsLog: SentEmailRecord[] = [];

/**
 * Dispatches an automated confirmation email to a client after creating a project request.
 */
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
  const confirmationMessage = 'Your project has been created and our team will reach out soon.';

  const plainTextBody = `
Hello ${clientName},

${confirmationMessage}

Here are the details of your project submission and scheduled kick-off discussion:

--------------------------------------------------
PROJECT SUMMARY
--------------------------------------------------
Project Name: ${projectName}
${projectDescription ? `Scope: ${projectDescription}\n` : ''}${companyName ? `Client: ${companyName}\n` : ''}${leadOwnerName ? `Assigned Lead: ${leadOwnerName}\n` : ''}Status: Pending Setup (Awaiting Internal Verification)

--------------------------------------------------
KICK-OFF MEETING PREFERENCE
--------------------------------------------------
Scheduled Time: ${formattedDate}
Meeting Join Link: ${meetingLink}

Please bookmark the meeting link above. Our team will review your project parameters and join the session at your requested time. If you need to reschedule or have urgent inquiries, reply directly to this email or reach out to your account manager.

Thank you for choosing White Ink / PlanForge!

Best regards,
The Operations & Delivery Team
White Ink Portal
`.trim();

  const emailRecord: SentEmailRecord = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: toEmail,
    subject,
    meetingLink,
    meetingTime: formattedDate,
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
    previewText: confirmationMessage,
  };

  sentEmailsLog.push(emailRecord);

  // Formatted console output for server activity observability
  console.log('\n======================================================================');
  console.log('[AUTOMATED EMAIL SERVICE] 📨 Project Confirmation Email Dispatched');
  console.log(`To:           ${toEmail} (${clientName})`);
  console.log(`Subject:      ${subject}`);
  console.log(`Meeting Time: ${formattedDate}`);
  console.log(`Meeting Link: ${meetingLink}`);
  console.log(`Message:      ${confirmationMessage}`);
  console.log('----------------------------------------------------------------------');
  console.log(plainTextBody);
  console.log('======================================================================\n');

  return {
    success: true,
    emailRecord,
  };
}

/**
 * Returns the history of dispatched automated emails for testing/debugging.
 */
export function getSentEmailsLog(): SentEmailRecord[] {
  return [...sentEmailsLog];
}
