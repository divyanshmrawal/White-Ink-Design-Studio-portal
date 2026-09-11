import { google } from 'googleapis';
import { getAuthenticatedClient } from './auth.ts';
import { sanitizeErrorMessage } from './crypto.ts';

export interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Sends a transactional email using the connected Super Admin Gmail account.
 */
export async function sendGmailMessage(params: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { to, subject, text, html } = params;

  const authRes = await getAuthenticatedClient();
  if (!authRes.success) {
    return { success: false, error: authRes.message };
  }

  const gmail = google.gmail({ version: 'v1', auth: authRes.oauth2Client });

  try {
    const boundary = `__boundary_${Date.now()}__`;
    const messageParts = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      text || html?.replace(/<[^>]+>/g, '') || '',
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      html || `<p>${text || ''}</p>`,
      '',
      `--${boundary}--`,
    ];

    const rawMessage = messageParts.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      success: true,
      messageId: res.data.id || undefined,
    };
  } catch (err: any) {
    console.error('Failed to send email via Gmail API:', err?.message || err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}
