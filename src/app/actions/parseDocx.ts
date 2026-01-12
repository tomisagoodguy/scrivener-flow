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

    // Generalized Phone Regex: Matches TEL, Tel, 電話, 手機, etc. + optional separator + number
    // exclude ID/Identity which might be mixed in
    const phonePattern = /(?:TEL|Tel|電話|手機|連絡電話|聯絡電話)\s*[：:﹕\.]?\s*([\d\-\(\)\s]{8,})/;

    // Buyer
    parsedData.buyer_name = extract(/(?:買\s*方|買受人)\s*[：:﹕]?\s+(.*?)(?:\s+(?:ID|TEL|電話|身分證)|$)/, buyerBlock);
    const buyerPhoneMatch = buyerBlock.match(phonePattern);
    if (buyerPhoneMatch) {
      parsedData.buyer_phone = buyerPhoneMatch[1].trim().replace(/[^\d-]/g, '');
    }

    // Seller
    parsedData.seller_name = extract(/(?:賣\s*方|出賣人)\s*[：:﹕]?\s+(.*?)(?:\s+(?:ID|TEL|電話|身分證)|$)/, sellerBlock);
    const sellerPhoneMatch = sellerBlock.match(phonePattern);
    if (sellerPhoneMatch) {
      parsedData.seller_phone = sellerPhoneMatch[1].trim().replace(/[^\d-]/g, '');
    }

    // --- 3. Payment Details ---
    const extractStage = (stageName: string) => {
      // Logic: StageName (optional '款'/'日') -> Amount -> (Method) -> (Date)
      // Example: "用印 100轉帳 (2024/01/01)" or "用印款: 100 (2024/01/01)"
      // Date can be in (), [], （）

      // Create a regex that is flexible about spaces and separators
      // 1. Match Stage Name (e.g. "用印")
      // 2. Optional "款"
      // 3. Flexible separator (space, colon)
      // 4. Capture Amount (digits + commas)
      // 5. Capture Method (optional text before date)
      // 6. Capture Date (YYYY/MM/DD inside brackets)

      const safeStage = stageName.split('').join('\\s*'); // "用印" -> "用\s*印"

      const patternStr =
        `${safeStage}(?:款)?` +                   // Name + optional "款"
        `\\s*[:：﹕]?\\s*` +                      // Separator
        `([\\d,]+)` +                              // Group 1: Amount
        `([^\\(\\)\\[\\]（）\\d]*)` +              // Group 2: Method (non-digit, non-bracket text)
        `\\s*[\\(\\)\\[\\]（）]` +                 // Start Bracket
        `\\s*(\\d{4}[\\/.-]\\d{1,2}[\\/.-]\\d{1,2})` + // Group 3: Date
        `\\s*[\\(\\)\\[\\]（）]`;                  // End Bracket

      const pattern = new RegExp(patternStr);
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

    // Sign Diff (補差額/簽差)
    // Sometimes labeled as "簽差" or "補差額"
    // Regex for specific Sign Diff pattern
    const signDiffMatch = rawText.match(/(?:簽差|補差額)(?:款)?\s*[:：﹕]?\s*\$?([\d,]+)\s*萬?\s*[\\(\\（]\s*(\d{4}[\/.-]\d{1,2}[\\/.-]\d{1,2})\s*[\\)\\）]/);
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

    // Fallback for Seal Date if not captured in stage
    if (!parsedData.seal_date) {
      const sealDateFallback = rawText.match(/(?:用印|用印日|用印時間)[^,]*?(\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})/);
      if (sealDateFallback) parsedData.seal_date = formatDate(sealDateFallback[1]);
    }

    // Tax (完稅)
    const tax = extractStage('完稅');
    if (tax) {
      parsedData.tax_amount = tax.amount;
      parsedData.tax_method = tax.method;
      parsedData.tax_payment_date = tax.date;
    }

    // Fallback for Tax Date
    if (!parsedData.tax_payment_date) {
      const taxDateFallback = rawText.match(/(?:完稅|完稅日|完稅時間)[^,]*?(\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})/);
      if (taxDateFallback) parsedData.tax_payment_date = formatDate(taxDateFallback[1]);
    }

    // Balance/Tail (尾款)
    const balance = extractStage('尾款');
    if (balance) {
      parsedData.balance_amount = balance.amount;
      parsedData.balance_method = balance.method;
      // User requested: Balance payment date is actually the handover date
      if (!parsedData.handover_date) {
        parsedData.handover_date = balance.date;
      }
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
