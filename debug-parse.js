const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../AB1252885-20260109143938.docx');

if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
}

mammoth.extractRawText({ path: filePath })
    .then(result => {
        console.log("=== RAW TEXT START ===");
        console.log(JSON.stringify(result.value, null, 2));
        console.log("=== RAW TEXT END ===");
    })
    .catch(err => {
        console.error("Error:", err);
    });
