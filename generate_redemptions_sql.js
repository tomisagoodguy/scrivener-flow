const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', '代償資訊.json');
const outputPath = path.join(__dirname, 'SETUP_REDEMPTIONS.sql');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    let sql = `-- Migration: Create bank_redemptions table
CREATE TABLE IF NOT EXISTS bank_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT,
    service_phone TEXT,
    account_info TEXT,
    lead_time TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_by UUID
);

-- RLS Policies
ALTER TABLE bank_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON bank_redemptions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all users" ON bank_redemptions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for all users" ON bank_redemptions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for all users" ON bank_redemptions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_redemptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_redemptions_updated_at
    BEFORE UPDATE ON bank_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_redemptions_updated_at();

-- Bulk Insert Data
INSERT INTO bank_redemptions (bank_name, service_phone, account_info, lead_time, notes) VALUES
`;

    const values = [];

    data.forEach(item => {
        // Skip empty rows if any
        if (!item['銀行'] && !item['專戶'] && !item['客服']) return;

        const bankName = escapeSql(item['銀行'] || '');
        const servicePhone = escapeSql(item['客服'] || '');
        const accountInfo = escapeSql(item['專戶'] || '');
        const leadTime = escapeSql(item['領清償時間'] || '');

        // Merge Unnamed columns into notes
        const noteParts = [];
        if (item['Unnamed: 3']) noteParts.push(item['Unnamed: 3']);
        if (item['Unnamed: 4']) noteParts.push(item['Unnamed: 4']);
        if (item['Unnamed: 6']) noteParts.push(item['Unnamed: 6']);
        if (item['Unnamed: 7']) noteParts.push(item['Unnamed: 7']);
        if (item['Unnamed: 8']) noteParts.push(item['Unnamed: 8']);

        const notes = escapeSql(noteParts.join('\n'));

        values.push(`('${bankName}', '${servicePhone}', '${accountInfo}', '${leadTime}', '${notes}')`);
    });

    sql += values.join(',\n') + ';';

    fs.writeFileSync(outputPath, sql);
    console.log(`Generated SQL with ${values.length} rows at ${outputPath}`);

} catch (err) {
    console.error('Error:', err);
}

function escapeSql(str) {
    if (typeof str !== 'string') str = String(str || '');
    return str.replace(/'/g, "''").trim();
}
