import fs from 'fs';
import path from 'path';
import 'dotenv/config';

/**
 * B2 Local Backup Script
 * Downloads the current database.json from Backblaze B2 to the local 'backups' folder.
 */

async function authorizeB2() {
    const keyId = process.env.B2_KEY_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY;

    if (!keyId || !applicationKey) {
        throw new Error('B2_KEY_ID or B2_APPLICATION_KEY is missing in env');
    }

    const credentials = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');
    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (!res.ok) throw new Error('B2 Authorization failed');
    return await res.json();
}

async function downloadBackup() {
    try {
        console.log('🚀 Starting Local Backup...');
        const auth = await authorizeB2();

        const bucketName = process.env.B2_BUCKET_NAME; // We need bucket name for download by name
        if (!bucketName) throw new Error('B2_BUCKET_NAME is missing in env');

        const dbFilename = 'database.json';
        const downloadUrl = `${auth.downloadUrl}/file/${bucketName}/${dbFilename}`;

        console.log(`📡 Downloading from: ${downloadUrl}`);
        const res = await fetch(downloadUrl, {
            headers: { 'Authorization': auth.authorizationToken }
        });

        if (!res.ok) {
            throw new Error(`Download failed with status: ${res.status}`);
        }

        const data = await res.json();

        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const localPath = path.join(backupDir, `local_db_${timestamp}.json`);

        fs.writeFileSync(localPath, JSON.stringify(data, null, 2));

        console.log(`✅ Backup saved successfully to: ${localPath}`);
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        process.exit(1);
    }
}

downloadBackup();
