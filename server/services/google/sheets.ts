import { google } from 'googleapis';
import { getAuthenticatedClient } from './auth.ts';
import { sanitizeErrorMessage } from './crypto.ts';
import { db } from '../../db.ts';

export const ATTENDANCE_HEADERS = [
  'Date',
  'Employee',
  'Email',
  'Status',
  'Clock In',
  'Clock Out',
  'Total Work Minutes',
  'Break Minutes',
  'Effective Work Minutes',
];

/**
 * Escapes sheet name for range queries, e.g. 'Attendance Log' or 'Sheet1'
 */
function getSheetRangePrefix(sheetName: string): string {
  const clean = sheetName.replace(/'/g, "''");
  return `'${clean}'`;
}

/**
 * Ensures the target Google Sheet has the required attendance column headers on row 1.
 */
async function ensureAttendanceSheetHeaders(
  sheets: any,
  spreadsheetId: string,
  sheetName: string
): Promise<boolean> {
  try {
    const rangePrefix = getSheetRangePrefix(sheetName);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${rangePrefix}!A1:I1`,
    });

    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${rangePrefix}!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [ATTENDANCE_HEADERS],
        },
      });
    }
    return true;
  } catch (err: any) {
    console.warn('[SHEETS] Could not verify/initialize attendance sheet headers:', err?.message || err);
    return false;
  }
}

/**
 * Synchronizes an individual attendance record to the configured Google Sheet.
 * PostgreSQL remains 100% authoritative for all attendance calculations and records.
 */
export async function syncAttendanceToSheet(attendanceId: string): Promise<{
  success: boolean;
  sheetsRowIndex?: number;
  error?: string;
}> {
  const integration = db.getGoogleIntegration();
  const spreadsheetId = integration?.sheetsAttendanceSpreadsheetId;
  const sheetName = integration?.sheetsAttendanceSheetName || 'Attendance_Log';

  if (!spreadsheetId) {
    return { success: false, error: 'Google Sheets attendance spreadsheet ID is not configured.' };
  }

  const authRes = await getAuthenticatedClient();
  if (!authRes.success) {
    return { success: false, error: authRes.message || 'Google account not connected.' };
  }

  const record = db.getAttendanceById(attendanceId);
  if (!record) {
    return { success: false, error: 'Attendance record not found.' };
  }

  const user = db.getUserById(record.userId);
  const employeeName = user?.name || 'Unknown Employee';
  const employeeEmail = user?.email || 'N/A';

  const clockInFormatted = record.clockIn
    ? new Date(record.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';
  const clockOutFormatted = record.clockOut
    ? new Date(record.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const nowIso = new Date().toISOString();

  // 9 Required Columns
  const rowValues = [
    record.date,
    employeeName,
    employeeEmail,
    record.status,
    clockInFormatted,
    clockOutFormatted,
    record.totalWorkingMinutes || 0,
    record.totalBreakMinutes || 0,
    record.effectiveWorkingMinutes || 0,
  ];

  const sheets = google.sheets({ version: 'v4', auth: authRes.oauth2Client });
  const rangePrefix = getSheetRangePrefix(sheetName);

  try {
    await ensureAttendanceSheetHeaders(sheets, spreadsheetId, sheetName);

    if (record.sheetsRowIndex && record.sheetsRowIndex > 1) {
      // Update existing row in place (avoid duplicate rows)
      const range = `${rangePrefix}!A${record.sheetsRowIndex}:I${record.sheetsRowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues],
        },
      });

      db.updateAttendanceSyncStatus(attendanceId, {
        sheetsSyncedAt: nowIso,
      });

      return { success: true, sheetsRowIndex: record.sheetsRowIndex };
    } else {
      // Append new row to sheet
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${rangePrefix}!A:I`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });

      // Extract new row index from updatedRange e.g. "'Attendance_Log'!A15:I15"
      let newRowIndex: number | undefined;
      const updatedRange = appendRes.data.updates?.updatedRange;
      if (updatedRange) {
        const match = updatedRange.match(/!A(\d+):/) || updatedRange.match(/!A(\d+)/);
        if (match && match[1]) {
          newRowIndex = parseInt(match[1], 10);
        }
      }

      db.updateAttendanceSyncStatus(attendanceId, {
        sheetsSyncedAt: nowIso,
        sheetsRowIndex: newRowIndex,
      });

      return { success: true, sheetsRowIndex: newRowIndex };
    }
  } catch (err: any) {
    console.error('[SHEETS] Failed to sync attendance record to Google Sheets:', err?.message || err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Triggers a manual bulk synchronization of all attendance records to Google Sheets.
 * Accessible only by Super Admin.
 */
export async function syncAllAttendancesToSheets(): Promise<{
  success: boolean;
  total: number;
  synced: number;
  errors: number;
}> {
  const records = db.getAttendances();
  let synced = 0;
  let errors = 0;

  for (const rec of records) {
    const res = await syncAttendanceToSheet(rec.id);
    if (res.success) {
      synced++;
    } else {
      errors++;
    }
  }

  // Update lastSyncAt timestamp
  try {
    db.updateGoogleIntegration({
      lastSyncAt: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }

  return { success: true, total: records.length, synced, errors };
}
