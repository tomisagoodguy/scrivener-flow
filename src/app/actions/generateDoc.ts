'use server';

import { supabase } from '@/lib/supabaseClient';
import { createReport } from 'docx-templates';
import fs from 'fs';
import path from 'path';

export async function generateDocument(caseId: string, type: string) {
    try {
        console.log(`>>> generateDocument called for case: ${caseId}, type: ${type}`);

        // 1. Fetch case data
        const { data: caseData, error } = await supabase
            .from('cases')
            .select(`
                *,
                milestones (*),
                financials (*)
            `)
            .eq('id', caseId)
            .single();

        if (error || !caseData) {
            throw new Error('找不到案件資料');
        }

        // 2. Load Template
        const templatePath = path.join(process.cwd(), 'public', 'templates', `${type}.docx`);
        if (!fs.existsSync(templatePath)) {
            throw new Error(`找不到範本檔案: ${type}.docx`);
        }

        const template = fs.readFileSync(templatePath);

        // 3. Prepare Data for template
        // Flatten data for easier use in docx-templates
        const m = Array.isArray(caseData.milestones) ? caseData.milestones[0] : caseData.milestones;
        const f = Array.isArray(caseData.financials) ? caseData.financials[0] : caseData.financials;

        const reportData = {
            case: {
                ...caseData,
                milestones: m,
                financials: f
            },
            // Add some formatted fields
            today: new Date().toLocaleDateString('zh-TW'),
            total_price_formatted: f?.total_price ? `${f.total_price} 萬` : '未填寫',
        };

        // 4. Create Report
        const buffer = await createReport({
            template,
            data: reportData,
            cmdDelimiter: ['{', '}'], // Default is +++ +++
        });

        // 5. Convert to Base64
        const fileBase64 = Buffer.from(buffer).toString('base64');

        return {
            status: 'success',
            fileBase64,
            filename: `${caseData.case_number || '案件'}_${type}.docx`,
            message: '產生成功'
        };

    } catch (err: any) {
        console.error('generateDocument Error:', err);
        return {
            status: 'error',
            message: err.message || '產生文件時發生錯誤'
        };
    }
}
