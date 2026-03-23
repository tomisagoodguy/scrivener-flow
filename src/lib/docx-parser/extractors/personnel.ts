
import { ParsedCaseData } from '../../../domain/case/types';

export function extractPersonnel(rawText: string): Partial<ParsedCaseData> {
    const data: Partial<ParsedCaseData> = {};

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

    interface PersonEntry {
        name: string;
        phones: string[];
    }
    const people: Record<string, PersonEntry> = {
        buyer: { name: '', phones: [] },
        seller: { name: '', phones: [] },
        registrant: { name: '', phones: [] },
        agent: { name: '', phones: [] },
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

    // Assign to data
    if (people.buyer.name) data.buyer_name = people.buyer.name;
    if (people.buyer.phones.length > 0) data.buyer_phone = people.buyer.phones[0];

    if (people.seller.name) data.seller_name = people.seller.name;
    if (people.seller.phones.length > 0) data.seller_phone = people.seller.phones[0];

    // Strict Rule for Optional Roles (Registrant/Agent):
    // Only assign phone if Name exists. "No Name = No Phone"
    if (people.registrant.name) {
        data.registrant_name = people.registrant.name;
        if (people.registrant.phones.length > 0) {
            data.registrant_phone = people.registrant.phones[0];
        }
    }

    if (people.agent.name) {
        data.agent_name = people.agent.name;
        if (people.agent.phones.length > 0) {
            data.agent_phone = people.agent.phones[0];
        }
    }

    return data;
}
