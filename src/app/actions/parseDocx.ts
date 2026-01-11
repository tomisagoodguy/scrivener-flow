'use server';

import mammoth from 'mammoth';

interface ParsedCaseData {
    case_number?: string;
    buyer_name?: string;
    buyer_phone?: string;
    seller_name?: string;
    seller_phone?: string;
    contract_date?: string;
    seal_date?: string;
    tax_payment_date?: string;
    balance_payment_date?: string;
    handover_date?: string;
    total_price?: number;
    // Payment details
    contract_amount?: number;
    contract_method?: string;
    sign_diff_amount?: number;
    sign_diff_date?: string;
    seal_amount?: number;
    seal_method?: string;
    tax_amount?: number;
    tax_method?: string;
    balance_amount?: number;
    balance_method?: string;
    debug_text?: string;
}

export async function parseDocx(formData: FormData): Promise<ParsedCaseData> {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file uploaded');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { value: rawText } = await mammoth.extractRawText({ buffer });

    const result: ParsedCaseData = {
        debug_text: rawText.substring(0, 500) + '...'
    };

    // --- 1. Basic Data ---
    const objMatch = rawText.match(/物件編號\s*[：:﹕]\s*([A-Za-z0-9-]+)/);
    if (objMatch) result.case_number = objMatch[1].trim();

    let priceMatch = rawText.match(/總價\s*([\d,]+)\s*萬/);
    if (!priceMatch) priceMatch = rawText.match(/總價[\s\S]*?(\d{3,})\s*萬/);
    if (priceMatch) {
        result.total_price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // --- 2. People Data ---
    const sellerMarkerRegex = /賣\s*方/;
    const sellerMatch = rawText.match(sellerMarkerRegex);
    let buyerBlock = rawText;
    let sellerBlock = "";
    if (sellerMatch && sellerMatch.index !== undefined) {
        buyerBlock = rawText.substring(0, sellerMatch.index);
        sellerBlock = rawText.substring(sellerMatch.index);
    }

    const extractPeople = (blockText: string, roleKey: string) => {
        const nameMatch = blockText.match(new RegExp(`${roleKey}\\s*[：:﹕]?\\s+([\\s\\S]*?)\\s+(?:ID|TEL)`));
        const telMatch = blockText.match(/TEL\s*[：:﹕]\s*([\d\-\(\)\s]+)/);
        return {
            name: nameMatch?.[1].trim().replace(/\n/g, '').replace(/\r/g, ''),
            phone: telMatch?.[1].trim().replace(/[^\d]/g, '')
        };
    };

    const bInfo = extractPeople(buyerBlock, "買\\s*方");
    const sInfo = extractPeople(sellerBlock, "賣\\s*方");
    result.buyer_name = bInfo.name;
    result.buyer_phone = bInfo.phone;
    result.seller_name = sInfo.name;
    result.seller_phone = sInfo.phone;

    // --- 3. Payment & Stages ---
    const stages = [
        { label: '簽約', dbPrefix: 'contract' },
        { label: '用印', dbPrefix: 'seal' },
        { label: '完稅', dbPrefix: 'tax' },
        { label: '尾款', dbPrefix: 'balance' }
    ];

    stages.forEach(stage => {
        // Flexible regex to match stage date
        const dateRegex = new RegExp(`${stage.label}[^\\(]*?\\((\\d{4}/\\d{2}/\\d{2})\\)`);
        const dateMatch = rawText.match(dateRegex);

        if (dateMatch) {
            const dateStr = dateMatch[1].replace(/\//g, '-');
            const prefix = (stage.dbPrefix === 'tax' || stage.dbPrefix === 'balance')
                ? `${stage.dbPrefix}_payment`
                : stage.dbPrefix;

            (result as any)[`${prefix}_date`] = dateStr;

            // Optional amount extraction: look for numbers immediately after the stage label
            const amountRegex = new RegExp(`${stage.label}\\s*([\\d,]+)`);
            const amountMatch = rawText.match(amountRegex);
            if (amountMatch) {
                (result as any)[`${stage.dbPrefix}_amount`] = parseFloat(amountMatch[1].replace(/,/g, ''));
            }

            if (stage.label === '簽約') {
                const diffRegex = /簽差\s*\$?([\d,]+)\s*萬?\s*\((\d{4}\/\d{2}\/\d{2})\)/;
                const diffMatch = rawText.match(diffRegex);
                if (diffMatch) {
                    result.sign_diff_amount = parseFloat(diffMatch[1].replace(/,/g, ''));
                    result.sign_diff_date = diffMatch[2].replace(/\//g, '-');
                }
            }
        }
    });

    // Handover
    const hoMatch = rawText.match(/交屋\s+[\s\S]*?\((\d{4}\/\d{2}\/\d{2})\)/);
    if (hoMatch) result.handover_date = hoMatch[1].replace(/\//g, '-');

    return result;
}
