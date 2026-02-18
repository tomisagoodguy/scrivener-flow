
import { ParsedCaseData } from '../../../domain/case/types';
import { formatDate } from '../utils';

const extractStagePythonStyle = (flatText: string, stageName: string) => {
    // Construct regex matching Python's pattern but with stricter boundaries.
    // We use a "Tempered Greedy Token" (?:(?!(?:...)).)*? to ensure we don't cross over other stage keywords.
    // This prevents "用印" (Seal) mentioned in a preamble from greedily matching the "簽約" (Contract) date.

    const boundaryKeywords = '簽約|用印|完稅|尾款|總價';

    // Regex Explanation:
    // ${stageName}          : Start with the target stage (e.g., '用印')
    // (?:(?!(?:...)).)*?    : Match any character, BUT stop if we see a boundary keyword (Tempered Greedy)
    // ([\\d,]+)             : Group 1: Amount
    // ([^\\(\\s,]*)         : Group 2: Method (non-space, non-paren)
    // \\s*                  : Optional space
    // \\((\\d{4}/\\d{2}/\\d{2})\\) : Group 3: Date in parens

    const pattern = new RegExp(
        `${stageName}(?:(?!(?:${boundaryKeywords})).)*?([\\d,]+)([^\\(\\s,]*)\\s*\\((\\d{4}/\\d{2}/\\d{2})\\)`
    );

    const match = flatText.match(pattern);
    if (match) {
        return {
            amount: parseFloat(match[1].replace(/,/g, '')),
            method: match[2].trim(),
            date: formatDate(match[3]),
        };
    }
    return null;
};

export function extractPayments(flatText: string): Partial<ParsedCaseData> {
    const data: Partial<ParsedCaseData> = {};

    // Contract
    const contract = extractStagePythonStyle(flatText, '簽約');
    if (contract) {
        data.contract_amount = contract.amount;
        data.contract_method = contract.method;
        data.contract_date = contract.date;
    }

    // Sign Diff (簽差)
    // Python: r"簽差\s*\$?([\d,]+)\s*萬?\s*\((\d{4}/\d{2}/\d{2})\)"
    const signDiffMatch = flatText.match(/簽差\s*\$?([\d,]+)\s*萬?\s*\((\d{4}\/\d{2}\/\d{2})\)/);
    if (signDiffMatch) {
        data.sign_diff_amount = parseFloat(signDiffMatch[1].replace(/,/g, ''));
        data.sign_diff_date = formatDate(signDiffMatch[2]);
    }

    // Seal
    const seal = extractStagePythonStyle(flatText, '用印');
    if (seal) {
        data.seal_amount = seal.amount;
        data.seal_method = seal.method;
        data.seal_date = seal.date;
    }

    // Tax
    const tax = extractStagePythonStyle(flatText, '完稅');
    if (tax) {
        data.tax_amount = tax.amount;
        data.tax_method = tax.method;
        data.tax_payment_date = tax.date;
    }

    // Balance/Tail
    const balance = extractStagePythonStyle(flatText, '尾款');
    if (balance) {
        data.balance_amount = balance.amount;
        data.balance_method = balance.method;
        data.balance_payment_date = balance.date;

        if (!data.handover_date) {
            data.handover_date = balance.date; // Default handover to balance date if not found
        }
    }

    // Handover / Transfer (Backup) - Originally in main block, good to have here
    if (!data.transfer_date) {
        const transferMatch = flatText.match(/(?:過戶|過戶日)\s*[:：]?\s*(\d{4}[\/.-]\d{2}[\/.-]\d{2})/);
        if (transferMatch) data.transfer_date = formatDate(transferMatch[1]);
    }
    if (!data.handover_date) { // Only if not set by balance
        const handoverMatch = flatText.match(/(?:交屋|交屋日)\s*[:：]?\s*(\d{4}[\/.-]\d{2}[\/.-]\d{2})/);
        if (handoverMatch) data.handover_date = formatDate(handoverMatch[1]);
    }

    return data;
}
