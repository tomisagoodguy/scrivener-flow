'use server';

import mammoth from 'mammoth';

interface ParsedCaseData {
    case_number?: string;
    buyer_name?: string;
    buyer_phone?: string;
    seller_name?: string;
    seller_phone?: string;
    registrant_name?: string;
    registrant_phone?: string;
    agent_name?: string;
    agent_phone?: string;
    escrow_account?: string;
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
    console.log('>>> Server Action Triggered: parseDocx (Enhanced Python Logic)');
    try {
        const file = formData.get('file');
        if (!file) throw new Error('No file uploaded');

        const buffer = Buffer.from(await (file as File).arrayBuffer());
        // Use raw text but try to preserve line structure if possible.
        // Mammoth extractRawText usually puts paragraphs on newlines.
        // Use convertToHtml to preserve Table structure
        // Python script: Iterates rows, commas between cells.
        // Mammoth extractRawText destroys table structure (just paragraphs).
        // converting to HTML allows us to see <tr> and <td>.
        const result = await mammoth.convertToHtml({ buffer });
        let html = result.value;

        // Simulate "formatted text" by converting HTML table markers to separators
        // 1. Replace cell endings with commas
        html = html.replace(/<\/td>|<\/th>/gi, ',');
        // 2. Replace row endings with newlines
        html = html.replace(/<\/tr>/gi, '\n');
        // 3. Replace <p> endings with spaces (start of p usually implies new line in text, but inside cell we want space)
        html = html.replace(/<\/p>/gi, ' ');
        // 4. Replace <br> with spaces
        html = html.replace(/<br\s*\/?>/gi, ' ');

        // 5. Strip all other tags
        let rawText = html.replace(/<[^>]+>/g, '');

        // Decode HTML entities (basic ones)
        rawText = rawText
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        // "Flat Text" for global regexes (still useful, but now rawText has structure)
        // We update flatText to be consistent with the structured rawText but single-lined
        const flatText = rawText.replace(/\s+/g, ' ').trim();

        console.log('Processed Structured Text (First 300 chars):', rawText.substring(0, 300));

        const parsedData: ParsedCaseData = {
            debug_text: rawText.substring(0, 800),
        };

        // --- Helper Regex Functions ---
        const extract = (pattern: RegExp, source: string): string | undefined => {
            const match = source.match(pattern);
            return match ? match[1].trim() : undefined;
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
        // Python: re.search(r"物件編號\s*[：:﹕]\s*([A-Za-z0-9-]+)", raw_text)
        parsedData.case_number = extract(/(?:物件編號|案號)\s*[：:﹕]\s*([A-Za-z0-9-]+)/, flatText);

        // Python: re.search(r"總價.*?(\d{3,})\s*萬", raw_text, re.DOTALL) OR re.search(r"總價\s*[,，]?\s*(\d+)", raw_text)
        let priceMatch = flatText.match(/總價.*?(\d{3,})\s*萬/);
        if (!priceMatch) {
            priceMatch = flatText.match(/總價\s*[,，]?\s*(\d+)/);
        }
        if (priceMatch) {
            parsedData.total_price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }

        // --- 2. Personnel Info (Python Logic Port - Token Stream) ---
        // Python script logic:
        // 1. Roles: Buyer, Seller, Registrant, Agent
        // 2. Safe Zone: "TEL"/"電話" or within first 4 tokens of a row
        // 3. Stop keywords: "銷售", "開發", "店長", "經紀人"

        const roleMap: Record<string, string> = {
            買方: 'buyer',
            買受人: 'buyer',
            賣方: 'seller',
            出賣人: 'seller',
            登記人: 'registrant',
            代理人: 'agent',
        };

        // Normalize keys in raw text to handle spacing like "買  方" -> "買方"
        // And also ensure standard colons
        const processedText = rawText
            .replace(/買\s*方/g, '買方')
            .replace(/賣\s*方/g, '賣方')
            .replace(/出\s*賣\s*人/g, '賣方')
            .replace(/買\s*受\s*人/g, '買方')
            .replace(/登\s*記\s*人/g, '登記人')
            .replace(/代\s*理\s*人/g, '代理人')
            .replace(/[:：﹕]/g, ' '); // Replace colons with space to separate labels from values

        // Split into tokens: split by commas, newlines, or spaces
        // Mammoth output is unstructured, so we treat it as a stream
        const tokens = processedText.split(/[,，\s\n]+/).filter((t) => t.trim().length > 0);

        const people: any = {
            buyer: { name: '', phones: [] as string[] },
            seller: { name: '', phones: [] as string[] },
            registrant: { name: '', phones: [] as string[] },
            agent: { name: '', phones: [] as string[] },
        };

        let currentRole: string | null = null;
        let distFromRole = 0;

        for (const token of tokens) {
            // 1. Check if token is a Role Keyword
            let foundRole = false;
            for (const [key, roleStr] of Object.entries(roleMap)) {
                if (token.includes(key)) {
                    currentRole = roleStr;
                    distFromRole = 0;
                    foundRole = true;
                    break;
                }
            }
            if (foundRole) continue;

            // 2. If inside a role context
            if (currentRole) {
                distFromRole++;

                // STOP Condition: Context Breakers
                // If we encounter any sales-related keyword or other field labels, stop.
                const stopKeywords = [
                    '銷售',
                    '開發',
                    '店長',
                    '經紀人',
                    '營業員',
                    '塗銷',
                    '方式',
                    '代償',
                    '銀行',
                    '備註',
                    '總價',
                    '車位',
                    '物件',
                ];

                if (stopKeywords.some((kw) => token.includes(kw))) {
                    currentRole = null; // Exit context
                    continue;
                }

                // NAME Extraction
                // If we haven't found a name yet, and it's reasonably close.
                // Reduced distance to 3 to avoid skipping over empty cells too far.
                if (!people[currentRole].name && distFromRole <= 3) {
                    const upperToken = token.toUpperCase();
                    const invalidNameKeywords = ['ID', 'TEL', '電話', '分機', '手機', '先生', '小姐', '太太'];

                    if (
                        !invalidNameKeywords.some((k) => upperToken.includes(k)) &&
                        !token.match(/^[\d,.-]+$/) && // not pure numbers/dates
                        !token.includes('/') && // date check
                        token.length < 10 && // Name length heuristic
                        token.length > 1
                    ) {
                        // Single char might be junk?
                        people[currentRole].name = token;
                    }
                }

                // PHONE Extraction (Safe Zone Logic -> Increased Tolerance)
                // Python script had implicit structural safety (first 4 cells).
                // Flattened text stream destroys cell boundaries, so "Address" becomes many tokens.
                // We increase safe distance to 20 to account for expanded address tokens.
                // The STOP Condition above prevents reading into the Sales section.
                let isSafe = false;
                if (token.toUpperCase().includes('TEL') || token.includes('電話')) {
                    isSafe = true;
                } else if (distFromRole <= 20) {
                    isSafe = true;
                }

                if (isSafe) {
                    // Extract 09xxxxxxxx
                    const cleanToken = token.replace(/[- \(\)]/g, '');
                    const phoneMatches = cleanToken.match(/(09\d{8})/g);
                    if (phoneMatches) {
                        for (const p of phoneMatches) {
                            if (!people[currentRole].phones.includes(p)) {
                                people[currentRole].phones.push(p);
                            }
                        }
                    }
                }
            }
        }

        // Assign to parsedData
        if (people.buyer.name) parsedData.buyer_name = people.buyer.name;
        if (people.buyer.phones.length > 0) parsedData.buyer_phone = people.buyer.phones[0];

        if (people.seller.name) parsedData.seller_name = people.seller.name;
        if (people.seller.phones.length > 0) parsedData.seller_phone = people.seller.phones[0];

        // Strict Rule for Optional Roles (Registrant/Agent):
        // Only assign phone if Name exists. "No Name = No Phone"
        if (people.registrant.name) {
            (parsedData as any).registrant_name = people.registrant.name;
            if (people.registrant.phones.length > 0) {
                (parsedData as any).registrant_phone = people.registrant.phones[0];
            }
        }

        if (people.agent.name) {
            (parsedData as any).agent_name = people.agent.name;
            if (people.agent.phones.length > 0) {
                (parsedData as any).agent_phone = people.agent.phones[0];
            }
        }

        // --- 3. Escrow Account ---
        parsedData.case_number = extract(/(?:物件編號|案號)\s*[：:﹕]\s*([A-Za-z0-9-]+)/, flatText); // Redundant but safe
        const accountMatch = flatText.match(/(?:帳號|履保帳號)\s*[：:﹕]\s*(\d{5,})/);
        if (accountMatch) {
            (parsedData as any).escrow_account = accountMatch[1];
        }

        // --- 4. Payment Details (Python Logic Port) ---
        // Python Loop: for stage in ['簽約', '用印', '完稅', '尾款']
        // Pattern: f"{stage}.*?([\d,]+)([^\(\s,]*)\s*\((\d{{4}}/\d{{2}}/\d{{2}})\)"

        const extractStagePythonStyle = (stageName: string) => {
            // Construct regex matching Python's pattern but with stricter boundaries.
            // We use a "Tempered Greedy Token" (?:(?!(?:...)).)*? to ensure we don't cross over other stage keywords.
            // This prevents "用印" (Seal) mentioned in a preamble from greedily matching the "簽約" (Contract) date.

            const otherStages = ['簽約', '用印', '完稅', '尾款', '總價'].filter((s) => s !== stageName).join('|');
            // Note: We also exclude the current stageName to avoid skipping from a "Label" to a "Note" if the Note repeats the label?
            // Actually, excluding ALL stage keywords is safest to enforce "Local Match".

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

        // Contract
        const contract = extractStagePythonStyle('簽約');
        if (contract) {
            parsedData.contract_amount = contract.amount;
            parsedData.contract_method = contract.method;
            parsedData.contract_date = contract.date;
        }

        // Sign Diff (簽差)
        // Python: r"簽差\s*\$?([\d,]+)\s*萬?\s*\((\d{4}/\d{2}/\d{2})\)"
        const signDiffMatch = flatText.match(/簽差\s*\$?([\d,]+)\s*萬?\s*\((\d{4}\/\d{2}\/\d{2})\)/);
        if (signDiffMatch) {
            parsedData.sign_diff_amount = parseFloat(signDiffMatch[1].replace(/,/g, ''));
            parsedData.sign_diff_date = formatDate(signDiffMatch[2]);
        }

        // Seal
        const seal = extractStagePythonStyle('用印');
        if (seal) {
            parsedData.seal_amount = seal.amount;
            parsedData.seal_method = seal.method;
            parsedData.seal_date = seal.date;
        }

        // Tax
        const tax = extractStagePythonStyle('完稅');
        if (tax) {
            parsedData.tax_amount = tax.amount;
            parsedData.tax_method = tax.method;
            parsedData.tax_payment_date = tax.date;
        }

        // Balance/Tail
        const balance = extractStagePythonStyle('尾款');
        if (balance) {
            parsedData.balance_amount = balance.amount;
            parsedData.balance_method = balance.method;
            parsedData.balance_payment_date = balance.date;

            if (!parsedData.handover_date) {
                parsedData.handover_date = balance.date;
            }
        }

        // Handover / Transfer (Backup)
        if (!parsedData.transfer_date) {
            const transferMatch = flatText.match(/(?:過戶|過戶日)\s*[:：]?\s*(\d{4}[\/.-]\d{2}[\/.-]\d{2})/);
            if (transferMatch) parsedData.transfer_date = formatDate(transferMatch[1]);
        }
        if (!parsedData.handover_date) {
            const handoverMatch = flatText.match(/(?:交屋|交屋日)\s*[:：]?\s*(\d{4}[\/.-]\d{2}[\/.-]\d{2})/);
            if (handoverMatch) parsedData.handover_date = formatDate(handoverMatch[1]);
        }

        return parsedData;
    } catch (e: any) {
        console.error('Parse Error', e);
        return { debug_text: 'Error parsing file: ' + e.message };
    }
}
