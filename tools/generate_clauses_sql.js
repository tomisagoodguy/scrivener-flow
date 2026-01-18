const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const csvPath = 'c:/Users/user/Documents/GitHub/scrivener-flow/clauses.csv';
const sqlPath = 'c:/Users/user/Documents/GitHub/scrivener-flow/my-case-tracker/bulk_insert_clauses.sql';

if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at ' + csvPath);
    process.exit(1);
}

const workbook = XLSX.readFile(csvPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(`Read ${rows.length} rows.`);

let sql = `
-- Batch insert clauses
INSERT INTO contract_clauses (title, content, category) VALUES
`;

const values = [];

// Skip header? The user said "一行是..." implying first row is data based on file read sample "借車位使用...".
// The sample I read earlier: "借車位使用,買賣雙方協議..." which looks like meaningful data, not "Title,Content".
// So I will include the first row.

for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    let title = row[0];
    let content = row[1];
    let category = row[2] || '一般';

    if (title && content) {
        // Escape single quotes for SQL
        title = title.toString().replace(/'/g, "''");
        content = content.toString().replace(/'/g, "''");
        category = category.toString().replace(/'/g, "''");

        values.push(`('${title}', '${content}', '${category}')`);
    }
}

if (values.length === 0) {
    console.log('No valid rows found');
    process.exit(0);
}

sql += values.join(',\n') + ';';

fs.writeFileSync(sqlPath, sql);
console.log(`Generated SQL with ${values.length} records to ${sqlPath}`);
