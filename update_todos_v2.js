const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres:iKSN3yBgEXnr5Hdx@db.zvomerdcsxvuymnpuvxk.supabase.co:6543/postgres?prepareThreshold=0',
});

async function update() {
    try {
        await client.connect();
        const sql = `
            UPDATE cases 
            SET todos = (COALESCE(todos, '{}'::jsonb) || '{
                "整交屋": false, 
                "實登": false, 
                "打單": false, 
                "履保": false, 
                "水電": false, 
                "稅費分算": false, 
                "保單": false
            }'::jsonb)
        `;
        await client.query(sql);
        console.log('SUCCESS');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

update();
