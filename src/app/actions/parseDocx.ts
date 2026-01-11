'use server';

import mammoth from 'mammoth';

interface ParsedCaseData {
  case_number?: string;
  buyer_name?: string;
  buyer_phone?: string;
  seller_name?: string;
  seller_phone?: string;
  total_price?: number;

  contract_date?: string;
  contract_amount?: number;
  contract_method?: string;

  sign_diff_date?: string;
  sign_diff_amount?: number;

  seal_date?: string;
  seal_amount?: number;
  seal_method?: string;

  tax_payment_date?: string;
  tax_amount?: number;
  tax_method?: string;

  balance_payment_date?: string;
  balance_amount?: number;
  balance_method?: string;

  transfer_date?: string;
  handover_date?: string;

  debug_text?: string;
}

export async function parseDocx(formData: FormData): Promise<ParsedCaseData> {
  console.log('>>> Server Action Triggered: parseDocx (Enhanced)');
  try {
    const file = formData.get('file');
    if (!file) throw new Error('No file uploaded');

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value.replace(/\s+/g, ' ').trim();

    console.log('Raw Text Preview:', rawText.substring(0, 200));

    const parsedData: ParsedCaseData = {
      debug_text: rawText.substring(0, 800)
    };

    // --- Helper Regex Functions ---
    const extract = (pattern: RegExp, source: string = rawText): string | undefined => {
      const match = source.match(pattern);
      return match ? match[1].trim() : undefined;
    };

    const extractPrice = (pattern: RegExp, source: string = rawText): number | undefined => {
      const match = source.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
      return undefined;
    };

    // Format: YYYY/MM/DD -> YYYY-MM-DD
    const formatDate = (dateStr?: string): string | undefined => {
      if (!dateStr) return undefined;
      const parts = dateStr.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
      if (parts) {
        const year = parts[1];
        const month = parts[2].padStart(2, '0');
        const day = parts[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return undefined;
    };

    // --- 1. Basic Info ---
    parsedData.case_number = extract(/(?:物件編號|案號)\s*[：:﹕]\s*([A-Za-z0-9-]+)/);

    let price = extractPrice(/總價\s*([\d,]+)\s*萬/);
    if (!price) {
      price = extractPrice(/總價.*?(\d{3,})\s*萬/);
    }
    parsedData.total_price = price;

    // --- 2. Buyer / Seller Split ---
    let buyerBlock = rawText;
    let sellerBlock = "";

    let splitIdx = rawText.indexOf("賣  方");
    if (splitIdx === -1) splitIdx = rawText.indexOf("賣 方");
    if (splitIdx === -1) splitIdx = rawText.indexOf("賣方");

    if (splitIdx !== -1) {
      buyerBlock = rawText.substring(0, splitIdx);
      sellerBlock = rawText.substring(splitIdx);
    }

    // Buyer
    parsedData.buyer_name = extract(/(?:買\s*方|買受人)\s*[：:﹕]?\s+(.*?)\s+(?:ID|TEL|身分證)/, buyerBlock);
    parsedData.buyer_phone = extract(/TEL\s*[：:﹕]\s*([\d\-\(\)\s]+)/, buyerBlock);
    if (parsedData.buyer_phone) parsedData.buyer_phone = parsedData.buyer_phone.replace(/[^\d-]/g, '');

    // Seller
    parsedData.seller_name = extract(/(?:賣\s*方|出賣人)\s*[：:﹕]?\s+(.*?)\s+(?:ID|TEL|身分證)/, sellerBlock);
    parsedData.seller_phone = extract(/TEL\s*[：:﹕]\s*([\d\-\(\)\s]+)/, sellerBlock);
    if (parsedData.seller_phone) parsedData.seller_phone = parsedData.seller_phone.replace(/[^\d-]/g, '');

    // --- 3. Payment Details ---
    const extractStage = (stageName: string) => {
      const pattern = new RegExp(`${stageName}\\s+([\\d,]+)([^\\(\\s]*)\\s*\\((\\d{4}[\\/.-]\\d{2}[\\/.-]\\d{2})\\)`);
      const match = rawText.match(pattern);
      if (match) {
        return {
          amount: parseFloat(match[1].replace(/,/g, '')),
          method: match[2].trim(),
          date: formatDate(match[3])
        };
      }
      return null;
    };

    // Contract (簽約)
    const contract = extractStage('簽約');
    if (contract) {
      parsedData.contract_amount = contract.amount;
      parsedData.contract_method = contract.method;
      parsedData.contract_date = contract.date;
    }

    // Sign Diff (補差額)
    const signDiffMatch = rawText.match(/簽差\s*\$?([\d,]+)\s*萬?\s*\((\d{4}[\/.-]\d{2}[\/.-]\d{2})\)/);
    if (signDiffMatch) {
      parsedData.sign_diff_amount = parseFloat(signDiffMatch[1].replace(/,/g, ''));
      parsedData.sign_diff_date = formatDate(signDiffMatch[2]);
    }

    // Seal (用印)
    const seal = extractStage('用印');
    if (seal) {
      parsedData.seal_amount = seal.amount;
      parsedData.seal_method = seal.method;
      parsedData.seal_date = seal.date;
    }

    // Tax (完稅)
    const tax = extractStage('完稅');
    if (tax) {
      parsedData.tax_amount = tax.amount;
      parsedData.tax_method = tax.method;
      parsedData.tax_payment_date = tax.date;
    }

    // Balance/Tail (尾款)
    const balance = extractStage('尾款');
    if (balance) {
      parsedData.balance_amount = balance.amount;
      parsedData.balance_method = balance.method;
      parsedData.balance_payment_date = balance.date;
    }

    // --- 4. Other Dates ---
    if (!parsedData.transfer_date) {
      const transferMatch = rawText.match(/(?:過戶|過戶日)\s*[:：]?\s*(\d{4}[\/.-]\d{2}[\/.-]\d{2})/);
      if (transferMatch) parsedData.transfer_date = formatDate(transferMatch[1]);
    }

    if (!parsedData.handover_date) {
      // Improved: avoid matching general text or multiple dates
      const handoverMatch = rawText.match(/(?:交屋|交屋日)\s*[:：]?\s*(\d{4}[\/.-]\d{2}[\/.-]\d{2})/);
      if (handoverMatch) parsedData.handover_date = formatDate(handoverMatch[1]);
    }

    return parsedData;

  } catch (e: any) {
    console.error('Parse Error', e);
    return { debug_text: 'Error parsing file: ' + e.message };
  }
}
