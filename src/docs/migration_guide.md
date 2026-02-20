# kDance Migration & Configuration Guide

This guide explains how to configure your environment and move your video/streamer data between different devices (e.g., Local PC -> Production Server).

## 1. Backblaze B2 Configuration

To enable video uploads, you must set up the following environment variables in your `.env.local` file.

### Required Variables
```env
B2_APPLICATION_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_ID=your_bucket_id
B2_BUCKET_NAME=your_bucket_name
```

### How to get these:
1.  Log in to [Backblaze B2](https://secure.backblaze.com/b2_buckets.htm).
2.  Go to **App Keys** and create a new master or application key.
3.  Go to **Buckets** and create a new bucket (make sure it is 'Public' for direct URL access).
4.  Copy the IDs and keys to your `.env.local`.

---

## 2. Moving Data (Local -> Production)

Since the application uses `localStorage` for dynamic content (to keep it ultra-fast and serverless-friendly), you need to manually sync data when moving between environments.

### Step-by-Step Sync:
1.  **On your Local PC**:
    - Go to `/admin`.
    - Select the **데이터 백업 (Data Backup)** tab.
    - Click **JSON 백업 파일 다운로드**.
2.  **On the Production Site** (or a different PC):
    - Go to `/admin`.
    - Select the **데이터 백업 (Data Backup)** tab.
    - Click **백업 파일 선택하기** and upload the JSON file you downloaded.
3.  The page will reload, and all your streamers and videos will now be visible on the new site!

---

## 3. Large File Uploads (CORS)

If you encounter errors when uploading large files (>5MB) on a new environment, ensure your B2 bucket CORS settings are correct.

Run this script if you have the B2 CLI installed, or update it via the web dashboard:
```bash
node scripts/update_b2_cors.mjs
```
The bucket must allow the `X-Bz-Part-Number` and `X-Bz-Content-Sha1` headers.
