
import { ParsedCaseData } from '../../../domain/case/types';

export function extractRedemption(rawText: string): Partial<ParsedCaseData> {
    const data: Partial<ParsedCaseData> = {};

    // --- 5. Seller Redemption (New Logic) ---
    // Porting Python logic: "清償資料" = {"銀行": "未找到", "設定額": "未找到"}
    // Strategy: Iterate lines. If line has "設定額" (Setting Amount) OR "清償" (Redemption), try to parse.

    const lines = rawText.split('\n');
    let foundBank = '';
    let foundRedemptionAmount = 0;

    for (const line of lines) {
        const cleanLine = line.trim();
        // Check for keywords
        if (cleanLine.includes('設定額') || cleanLine.includes('清償') || cleanLine.includes('代償')) {
            // Split by comma/space to isolate parts
            const parts = cleanLine.split(/[,，\s]+/).filter(p => p.trim().length > 0);

            let tempBank = '';
            let tempAmount = 0;

            for (const part of parts) {
                // A. Extract Amount
                if (part.includes('設定額') || part.includes('萬')) {
                    const amountMatch = part.match(/(\d+)/);
                    if (amountMatch) {
                        tempAmount = parseInt(amountMatch[1]);
                    }
                }

                // B. Extract Bank Name
                // Exclude keywords
                const isKeyword = ['清', '償', '代償', '設定額', '私人', '二胎', 'OK', '異常', '塗銷', '方式', '用印', '提醒'].some(k => part.includes(k));
                const cleanPart = part.replace(/[^\w\u4e00-\u9fa5]/g, ''); // Remove punctuation

                if (!isKeyword && cleanPart.length > 2) {
                    // Strategy: If it explicitly says "Bank", it's the winner.
                    // Otherwise, keep the longest candidate that looks like a name.
                    if (part.includes('銀行') || part.includes('庫') || part.includes('社')) {
                        tempBank = part;
                    } else if (cleanPart.length > tempBank.length && !tempBank.includes('銀行')) {
                        // Only replace if we haven't found a definite "Bank" yet
                        tempBank = part;
                    }
                }
            }

            // Update global found variables if we found something useful in this line
            if (tempAmount > 0) foundRedemptionAmount = tempAmount;
            if (tempBank) foundBank = tempBank;

            // If we found both, likely we are done with this section
            if (foundBank && foundRedemptionAmount > 0) break;
        }
    }

    // Only populate if we found a valid amount
    if (foundRedemptionAmount > 0) {
        if (foundBank) {
            data.seller_loan_bank = foundBank.trim();
        }
        data.seller_redemption_amount = foundRedemptionAmount;
    }

    return data;
}
