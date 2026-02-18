
import { ParsedCaseData } from '../../../domain/case/types';
import { extract } from '../utils';

export function extractBasicInfo(flatText: string): Partial<ParsedCaseData> {
    const data: Partial<ParsedCaseData> = {};

    // Case Number
    data.case_number = extract(/(?:物件編號|案號)\s*[：:﹕]\s*([A-Za-z0-9-]+)/, flatText);

    // Total Price
    let priceMatch = flatText.match(/總價.*?(\d{3,})\s*萬/);
    if (!priceMatch) {
        priceMatch = flatText.match(/總價\s*[,，]?\s*(\d+)/);
    }
    if (priceMatch) {
        data.total_price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // Escrow Account
    const accountMatch = flatText.match(/(?:帳號|履保帳號)\s*[：:﹕]\s*(\d{5,})/);
    if (accountMatch) {
        data.escrow_account = accountMatch[1];
    }

    return data;
}
