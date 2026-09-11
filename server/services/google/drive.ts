import { google } from 'googleapis';
import { Readable } from 'stream';
import { getAuthenticatedClient } from './auth.ts';
import { sanitizeErrorMessage } from './crypto.ts';
import { db } from '../../db.ts';

const ROOT_FOLDER_NAME = 'White Ink Portal';

/**
 * Ensures the root portal folder exists in the connected Google Drive.
 * Caches the folder ID in GoogleIntegration.driveRootFolderId.
 */
export async function ensureRootPortalFolder(): Promise<{ success: boolean; rootFolderId?: string; error?: string }> {
  const authRes = await getAuthenticatedClient();
  if (!authRes.success) return { success: false, error: authRes.message };

  const drive = google.drive({ version: 'v3', auth: authRes.oauth2Client });
  const integration = db.getGoogleIntegration();

  if (integration.driveRootFolderId) {
    try {
      const existing = await drive.files.get({
        fileId: integration.driveRootFolderId,
        fields: 'id, name, trashed',
      });
      if (existing.data.id && !existing.data.trashed) {
        return { success: true, rootFolderId: existing.data.id };
      }
    } catch {
      // Folder was deleted or ID invalid, will recreate below
    }
  }

  // Check if a folder named "White Ink Portal" already exists in root
  const query = `name = '${ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents`;
  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  let rootFolderId = listRes.data.files?.[0]?.id;

  if (!rootFolderId) {
    const createRes = await drive.files.create({
      requestBody: {
        name: ROOT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    rootFolderId = createRes.data.id || undefined;
  }

  if (rootFolderId) {
    db.updateGoogleIntegration({ driveRootFolderId: rootFolderId });
    return { success: true, rootFolderId };
  }

  return { success: false, error: 'Could not create or find White Ink Portal root folder.' };
}

/**
 * Creates or retrieves the dedicated folder for a Client under the White Ink Portal root folder.
 */
export async function ensureClientFolder(client: {
  id: string;
  name: string;
  company?: string | null;
  driveFolderId?: string | null;
}): Promise<{ success: boolean; folderId?: string; error?: string }> {
  const authRes = await getAuthenticatedClient();
  if (!authRes.success) return { success: false, error: authRes.message };

  const drive = google.drive({ version: 'v3', auth: authRes.oauth2Client });
  const rootRes = await ensureRootPortalFolder();
  if (!rootRes.success || !rootRes.rootFolderId) {
    return { success: false, error: rootRes.error || 'Root folder unavailable' };
  }

  if (client.driveFolderId) {
    try {
      const existing = await drive.files.get({
        fileId: client.driveFolderId,
        fields: 'id, trashed',
      });
      if (existing.data.id && !existing.data.trashed) {
        return { success: true, folderId: existing.data.id };
      }
    } catch {
      // Fallback to recreate
    }
  }

  const folderName = (client.company || client.name).trim();
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${rootRes.rootFolderId}' in parents`;
  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
  });

  let folderId = listRes.data.files?.[0]?.id;
  let folderUrl = (listRes.data.files?.[0] as any)?.webViewLink;

  if (!folderId) {
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootRes.rootFolderId],
      },
      fields: 'id, webViewLink',
    });
    folderId = createRes.data.id || undefined;
    folderUrl = (createRes.data as any)?.webViewLink;
  }

  if (folderId) {
    db.updateClient(client.id, {
      driveFolderId: folderId,
      driveFolderUrl: folderUrl || null,
    });
    return { success: true, folderId };
  }

  return { success: false, error: 'Failed to create client folder in Google Drive.' };
}

export interface ProjectFolderHierarchy {
  projectFolderId: string;
  subfolders: {
    deliverables?: string;
    proofs?: string;
    revisions?: string;
    handover?: string;
  };
}

/**
 * Creates the project folder and standard subfolders (Deliverables, Proofs, Revisions, Handover)
 * under the corresponding Client folder in Google Drive.
 */
export async function ensureProjectFolderStructure(project: {
  id: string;
  name: string;
  clientId: string;
  driveFolderId?: string | null;
}): Promise<{ success: boolean; structure?: ProjectFolderHierarchy; error?: string }> {
  const authRes = await getAuthenticatedClient();
  if (!authRes.success) return { success: false, error: authRes.message };

  const client = db.getClientById(project.clientId);
  if (!client) return { success: false, error: 'Client not found.' };

  const clientFolderRes = await ensureClientFolder(client);
  if (!clientFolderRes.success || !clientFolderRes.folderId) {
    return { success: false, error: clientFolderRes.error || 'Client folder creation failed' };
  }

  const drive = google.drive({ version: 'v3', auth: authRes.oauth2Client });

  // 1. Project Folder
  let projectFolderId = project.driveFolderId || undefined;
  if (projectFolderId) {
    try {
      const existing = await drive.files.get({ fileId: projectFolderId, fields: 'id, trashed' });
      if (existing.data.trashed) projectFolderId = undefined;
    } catch {
      projectFolderId = undefined;
    }
  }

  if (!projectFolderId) {
    const folderName = project.name.trim();
    const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${clientFolderRes.folderId}' in parents`;
    const listRes = await drive.files.list({ q: query, fields: 'files(id, name)' });

    if (listRes.data.files && listRes.data.files.length > 0) {
      projectFolderId = listRes.data.files[0].id || undefined;
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [clientFolderRes.folderId],
        },
        fields: 'id',
      });
      projectFolderId = createRes.data.id || undefined;
    }
  }

  if (!projectFolderId) {
    return { success: false, error: 'Could not create or find project folder in Google Drive.' };
  }

  db.updateProject(project.id, { driveFolderId: projectFolderId });

  // 2. Standard Subfolders
  const requiredSubfolders = ['Deliverables', 'Proofs', 'Revisions', 'Handover'];
  const subfolders: Record<string, string> = {};

  const existingSubs = await drive.files.list({
    q: `'${projectFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });

  const existingMap = new Map(existingSubs.data.files?.map((f) => [f.name?.toLowerCase(), f.id!]) || []);

  for (const subName of requiredSubfolders) {
    const key = subName.toLowerCase();
    if (existingMap.has(key)) {
      subfolders[key] = existingMap.get(key)!;
    } else {
      try {
        const subRes = await drive.files.create({
          requestBody: {
            name: subName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [projectFolderId],
          },
          fields: 'id',
        });
        if (subRes.data.id) {
          subfolders[key] = subRes.data.id;
        }
      } catch (err) {
        console.warn(`Could not create subfolder ${subName}:`, err);
      }
    }
  }

  return {
    success: true,
    structure: {
      projectFolderId,
      subfolders: {
        deliverables: subfolders['deliverables'],
        proofs: subfolders['proofs'],
        revisions: subfolders['revisions'],
        handover: subfolders['handover'],
      },
    },
  };
}

/**
 * Uploads a file buffer directly into the designated Google Drive folder.
 * Files remain strictly private (NO public read permissions).
 */
export async function uploadFileToDrive(options: {
  folderId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{
  success: boolean;
  fileId?: string;
  fileName?: string;
  size?: number;
  mimeType?: string;
  error?: string;
}> {
  const { folderId, filename, mimeType, buffer } = options;
  const authRes = await getAuthenticatedClient();
  if (!authRes.success) return { success: false, error: authRes.message };

  const drive = google.drive({ version: 'v3', auth: authRes.oauth2Client });

  try {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: stream,
      },
      fields: 'id, name, mimeType, size',
    });

    return {
      success: true,
      fileId: res.data.id || undefined,
      fileName: res.data.name || filename,
      size: res.data.size ? Number(res.data.size) : buffer.length,
      mimeType: res.data.mimeType || mimeType,
    };
  } catch (err: any) {
    console.error('Google Drive file upload failed:', err?.message || err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Retrieves a readable stream for a private Google Drive file to proxy to authenticated users.
 */
export async function getDriveFileStream(fileId: string): Promise<{
  success: boolean;
  stream?: any;
  filename?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}> {
  const authRes = await getAuthenticatedClient();
  if (!authRes.success) return { success: false, error: authRes.message };

  const drive = google.drive({ version: 'v3', auth: authRes.oauth2Client });

  try {
    const metaRes = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
    });

    const fileStreamRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return {
      success: true,
      stream: fileStreamRes.data,
      filename: metaRes.data.name || 'download',
      mimeType: metaRes.data.mimeType || 'application/octet-stream',
      size: metaRes.data.size ? Number(metaRes.data.size) : undefined,
    };
  } catch (err: any) {
    console.error('Failed to read file stream from Google Drive:', err?.message || err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Safely fetches metadata for a file in Google Drive without exposing any sensitive Google credentials.
 */
export async function getDriveFileMetadata(fileId: string): Promise<{
  success: boolean;
  file?: {
    id: string;
    name: string;
    mimeType: string;
    size?: number;
    createdTime?: string;
    modifiedTime?: string;
  };
  error?: string;
}> {
  const authRes = await getAuthenticatedClient();
  if (!authRes.success) return { success: false, error: authRes.message };

  const drive = google.drive({ version: 'v3', auth: authRes.oauth2Client });

  try {
    const res = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, trashed',
    });

    if (res.data.trashed) {
      return { success: false, error: 'File is in trash.' };
    }

    return {
      success: true,
      file: {
        id: res.data.id || fileId,
        name: res.data.name || 'unnamed',
        mimeType: res.data.mimeType || 'application/octet-stream',
        size: res.data.size ? Number(res.data.size) : undefined,
        createdTime: res.data.createdTime || undefined,
        modifiedTime: res.data.modifiedTime || undefined,
      },
    };
  } catch (err: any) {
    console.error('Failed to get metadata from Google Drive:', err?.message || err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Deletes a file from Google Drive if required.
 */
export async function deleteDriveFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  const authRes = await getAuthenticatedClient();
  if (!authRes.success) return { success: false, error: authRes.message };

  const drive = google.drive({ version: 'v3', auth: authRes.oauth2Client });
  try {
    await drive.files.delete({ fileId });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}
