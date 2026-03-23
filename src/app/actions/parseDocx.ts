'use server';

import { ParsedCaseData } from '../../domain/case/types';
import { processRawDocx } from '../../lib/docx-parser/preprocessor';
import { extractBasicInfo } from '../../lib/docx-parser/extractors/basicInfo';
import { extractPersonnel } from '../../lib/docx-parser/extractors/personnel';
import { extractPayments } from '../../lib/docx-parser/extractors/payments';
import { extractRedemption } from '../../lib/docx-parser/extractors/redemptions';

export async function parseDocx(formData: FormData): Promise<ParsedCaseData> {
    console.info('>>> Server Action Triggered: parseDocx (Refactored Modular Logic)');
    try {
        const file = formData.get('file');
        if (!file) throw new Error('No file uploaded');

        const buffer = Buffer.from(await (file as File).arrayBuffer());
        
        // 1. Preprocess: Convert Docx to Structured and Flat Text
        const { rawText, flatText } = await processRawDocx(buffer);

        console.info('Processed Structured Text (First 300 chars):', rawText.substring(0, 300));

        // 2. Initialize Data
        const parsedData: ParsedCaseData = {
            debug_text: rawText.substring(0, 800),
        };

        // 3. Extract Components
        const basicInfo = extractBasicInfo(flatText);
        const personnel = extractPersonnel(rawText);
        const payments = extractPayments(flatText);
        const redemptions = extractRedemption(rawText);

        // 4. Merge Results
        Object.assign(parsedData, basicInfo, personnel, payments, redemptions);

        return parsedData;
    } catch (e: unknown) {
        console.error('Parse Error', e);
        const message = e instanceof Error ? e.message : String(e);
        return { debug_text: 'Error parsing file: ' + message };
    }
}
