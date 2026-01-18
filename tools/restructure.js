const fs = require('fs');
const path = require('path');

const replacements = {
    "@/components/Header": "@/components/layout/Header",
    "@/components/SideNav": "@/components/layout/SideNav",
    "@/components/ThemeToggle": "@/components/layout/ThemeToggle",
    "@/components/ThemeProvider": "@/components/providers/ThemeProvider",
    "@/components/EditCaseForm": "@/components/features/cases/EditCaseForm",
    "@/components/CaseScheduleManager": "@/components/features/cases/CaseScheduleManager",
    "@/components/CaseCompactTodoList": "@/components/features/cases/CaseCompactTodoList",
    "@/components/CaseTodos": "@/components/features/cases/CaseTodos",
    "@/components/ExportExcelButton": "@/components/features/cases/ExportExcelButton",
    "@/components/GenericExportExcelButton": "@/components/features/cases/GenericExportExcelButton",
    "@/components/RecentCases": "@/components/features/cases/RecentCases",
    "@/components/DashboardDateCalculator": "@/components/dashboard/DashboardDateCalculator",
    "@/components/DashboardQuickNotes": "@/components/dashboard/DashboardQuickNotes",
    "@/components/DashboardStats": "@/components/dashboard/DashboardStats",
    "@/components/GlobalPipelineChart": "@/components/dashboard/GlobalPipelineChart",
    "@/components/TimelineGanttView": "@/components/dashboard/TimelineGanttView",
    "@/components/AuthGate": "@/components/shared/AuthGate",
    "@/components/HighlightableValue": "@/components/shared/HighlightableValue",
    "@/components/OvertimeButton": "@/components/shared/OvertimeButton",
    "@/components/QuickNotes": "@/components/shared/QuickNotes",
    "@/components/ExcelStep": "@/components/shared/ExcelStep"
};

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const srcPath = path.join(__dirname, 'src');
const allFiles = getAllFiles(srcPath);

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    Object.keys(replacements).forEach(oldPath => {
        // Use a more careful replacement to avoid partial matches
        // Match both single and double quotes
        const regex1 = new RegExp(`'${oldPath}'`, 'g');
        const regex2 = new RegExp(`"${oldPath}"`, 'g');

        if (regex1.test(content) || regex2.test(content)) {
            content = content.replace(regex1, `'${replacements[oldPath]}'`);
            content = content.replace(regex2, `"${replacements[oldPath]}"`);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});
