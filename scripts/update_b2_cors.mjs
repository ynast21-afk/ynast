
const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;

async function updateCors() {
    if (!B2_KEY_ID || !B2_KEY || !B2_BUCKET_ID) {
        console.error('Missing B2 environment variables.');
        process.exit(1);
    }

    console.log('Authorizing with B2...');
    const authHeader = Buffer.from(`${B2_KEY_ID}:${B2_KEY}`).toString('base64');
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: { 'Authorization': `Basic ${authHeader}` }
    });

    if (!authRes.ok) {
        console.error('Auth failed:', await authRes.text());
        process.exit(1);
    }

    const { apiUrl, authorizationToken } = await authRes.json();

    const corsRules = [
        {
            corsRuleName: "Allow-KStreamer-Upload",
            allowedOrigins: [
                "https://kdance.xyz",
                "http://localhost:3000"
            ],
            allowedOperations: [
                "s3_put",
                "b2_upload_file",
                "b2_upload_part",
                "b2_download_file_by_name"
            ],
            allowedHeaders: [
                "authorization",
                "content-type",
                "x-bz-file-name",
                "x-bz-content-sha1",
                "x-bz-part-number"
            ],
            exposeHeaders: [
                "x-bz-content-sha1"
            ],
            maxAgeSeconds: 3600
        }
    ];

    console.log('Updating CORS rules for bucket:', B2_BUCKET_ID);
    const updateRes = await fetch(`${apiUrl}/b2api/v2/b2_update_bucket`, {
        method: 'POST',
        headers: { 'Authorization': authorizationToken },
        body: JSON.stringify({
            bucketId: B2_BUCKET_ID,
            corsRules: corsRules
        })
    });

    if (!updateRes.ok) {
        console.error('Update failed:', await updateRes.text());
        process.exit(1);
    }

    console.log('CORS rules updated successfully!');
}

updateCors().catch(console.error);
