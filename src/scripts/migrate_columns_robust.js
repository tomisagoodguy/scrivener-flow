const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
    try {
        const envPath = path.join(__dirname, '../../.env.local');
        if (!fs.existsSync(envPath)) {
            console.error('.env.local not found at', envPath);
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        let password = '';
        let url = '';

        for (const line of lines) {
            if (line.startsWith('SUPABASE_DB_PASSWORD=')) {
                password = line.split('=')[1].trim();
                // Handle potential quotes
                if (password.startsWith('"') && password.endsWith('"')) {
                    password = password.slice(1, -1);
                }
            }
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
                url = line.split('=')[1].trim();
            }
        }

        if (!password) {
            console.error('Password not found in .env.local');
            return;
        }

        // Extract project ID from URL
        // https://zvomerdcsxvuymnpuvxk.supabase.co
        const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
        const projectId = match ? match[1] : 'zvomerdcsxvuymnpuvxk';

        const host = `db.${projectId}.supabase.co`;
        const connectionString = `postgres://postgres:${password}@${host}:5432/postgres`;

        console.log(`Connecting to ${host}...`);

        const client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false },
        });

        await client.connect();
        console.log('Connected! Running migration...');

        await client.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone text;');
        console.log('Added buyer_phone');

        await client.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone text;');
        console.log('Added seller_phone');

        await client.end();
        console.log('Migration successful!');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

run();
