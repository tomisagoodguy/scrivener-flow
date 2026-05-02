export interface ParsedEvent {
    title: string;
    startDate: string | null; // ISO string or 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'
    isAllDay: boolean;
    caseNumber?: string; // extracted case number token (e.g. "AA1215959")
}

// Case number: 1-3 uppercase letters followed by 4+ digits (e.g. AA1215959)
const CASE_NUMBER_RE = /^[A-Z]{1,3}\d{4,}$/;

const pad = (n: number) => String(n).padStart(2, '0');

function isValidDate(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function isValidTime(h: number, m: number): boolean {
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function toHour(h: number, ampm?: string): number {
    if (ampm === '下午' && h < 12) return h + 12;
    if (ampm === '上午' && h === 12) return 0;
    return h;
}

// ── 數字時間碼解析（4/7/8/11 位） ─────────────────────────────────────────────

function parseNumericToken(token: string): { startDate: string; isAllDay: boolean } | null {
    const now = new Date();
    const year = now.getFullYear();

    // 11-digit: YYYMMDDHHMM (ROC 100-129 + date + time)
    const roc11 = /^(1[01]\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(token);
    if (roc11) {
        const [, y, mo, d, h, mi] = roc11;
        const wYear = parseInt(y) + 1911;
        if (isValidDate(wYear, +mo, +d) && isValidTime(+h, +mi))
            return { startDate: `${wYear}-${mo}-${d}T${h}:${mi}`, isAllDay: false };
    }

    // 8-digit: MMDDHHMM
    const dt8 = /^(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(token);
    if (dt8) {
        const [, mo, d, h, mi] = dt8;
        if (isValidDate(year, +mo, +d) && isValidTime(+h, +mi))
            return { startDate: `${year}-${mo}-${d}T${h}:${mi}`, isAllDay: false };
    }

    // 7-digit: YYYMMDD (ROC 100-129, all-day)
    const roc7 = /^(1[01]\d)(\d{2})(\d{2})$/.exec(token);
    if (roc7) {
        const [, y, mo, d] = roc7;
        const wYear = parseInt(y) + 1911;
        if (isValidDate(wYear, +mo, +d))
            return { startDate: `${wYear}-${mo}-${d}`, isAllDay: true };
    }

    // 4-digit: MMDD only（全天）
    const d4 = /^(\d{2})(\d{2})$/.exec(token);
    if (d4) {
        const [, mo, d] = d4;
        if (isValidDate(year, +mo, +d))
            return { startDate: `${year}-${mo}-${d}`, isAllDay: true };
    }

    return null;
}

// ── 中文日期解析 ──────────────────────────────────────────────────────────────
// 支援以下格式（任意位置、可含下午/上午）：
//   5月4日                           → 全天
//   5月4日13點 / 5月4日下午1點30分    → 帶時間
//   115年5月4日 / 民國115年5月4日     → ROC 全天
//   民國115年5月4日下午1點            → ROC 帶時間

function parseChineseToken(token: string): { startDate: string; isAllDay: boolean } | null {
    const year = new Date().getFullYear();

    // ROC: [民國]YYY年M月D日[(下午|上午)?H[時點][MM分]]
    const rocRe = /^(?:民國)?(\d{2,3})年(\d{1,2})月(\d{1,2})日(?:(下午|上午)?(\d{1,2})[時點](?:(\d{1,2})分)?)?$/.exec(token);
    if (rocRe) {
        const [, y, mo, d, ampm, h, mi] = rocRe;
        const wYear = parseInt(y) + 1911;
        if (!isValidDate(wYear, +mo, +d)) return null;
        if (h !== undefined) {
            const hour = toHour(+h, ampm);
            if (isValidTime(hour, +(mi ?? '0')))
                return { startDate: `${wYear}-${pad(+mo)}-${pad(+d)}T${pad(hour)}:${pad(+(mi ?? '0'))}`, isAllDay: false };
        }
        return { startDate: `${wYear}-${pad(+mo)}-${pad(+d)}`, isAllDay: true };
    }

    // CE: M月D日[(下午|上午)?H[時點][MM分]]
    const ceRe = /^(\d{1,2})月(\d{1,2})日(?:(下午|上午)?(\d{1,2})[時點](?:(\d{1,2})分)?)?$/.exec(token);
    if (ceRe) {
        const [, mo, d, ampm, h, mi] = ceRe;
        if (!isValidDate(year, +mo, +d)) return null;
        if (h !== undefined) {
            const hour = toHour(+h, ampm);
            if (isValidTime(hour, +(mi ?? '0')))
                return { startDate: `${year}-${pad(+mo)}-${pad(+d)}T${pad(hour)}:${pad(+(mi ?? '0'))}`, isAllDay: false };
        }
        return { startDate: `${year}-${pad(+mo)}-${pad(+d)}`, isAllDay: true };
    }

    return null;
}

// ── 混合 token 解析（文字+數字碼，如「協議0504」） ────────────────────────────

function extractNumericFromMixed(token: string): { code: string; text: string } | null {
    // suffix digits
    const s = /^(.*?)(\d{4,11})$/.exec(token);
    if (s && parseNumericToken(s[2])) return { code: s[2], text: s[1] };
    // prefix digits
    const p = /^(\d{4,11})(.*)$/.exec(token);
    if (p && parseNumericToken(p[1])) return { code: p[1], text: p[2] };
    return null;
}

// 混合 token：文字前綴 + 中文日期，如「協議5月4日」「協議5月4日13點」
function extractChineseFromMixed(token: string): { dateToken: string; text: string } | null {
    // Try splitting at first digit that could start a Chinese date
    // Pattern: text prefix + (digits)月(digits)日...
    const s = /^(.*?)(\d{1,3}(?:年\d{1,2}月|\d{0,1}月)\d{1,2}日.*)$/.exec(token);
    if (s && parseChineseToken(s[2])) return { dateToken: s[2], text: s[1] };
    // 民國 prefix
    const roc = /^(.*?)(民國\d{2,3}年\d{1,2}月\d{1,2}日.*)$/.exec(token);
    if (roc && parseChineseToken(roc[2])) return { dateToken: roc[2], text: roc[1] };
    return null;
}

// ── 跨 token 組合：日期 token + 相鄰時間 token（如「5月4日」+「下午1點」） ───

function combineAdjacentTime(dateResult: { startDate: string; isAllDay: boolean }, nextToken: string): { startDate: string; isAllDay: boolean } | null {
    if (!dateResult.isAllDay) return null; // already has time
    // nextToken = (下午|上午)?H[時點][MM分]
    const t = /^(下午|上午)?(\d{1,2})[時點](?:(\d{1,2})分)?$/.exec(nextToken);
    if (!t) return null;
    const [, ampm, h, mi] = t;
    const hour = toHour(+h, ampm);
    if (!isValidTime(hour, +(mi ?? '0'))) return null;
    const datePart = dateResult.startDate.split('T')[0];
    return { startDate: `${datePart}T${pad(hour)}:${pad(+(mi ?? '0'))}`, isAllDay: false };
}

// ── 主解析函式 ────────────────────────────────────────────────────────────────

export function parseEventLine(input: string): ParsedEvent {
    const trimmed = input.trim();
    if (!trimmed) return { title: '', startDate: null, isAllDay: false };

    const tokens = trimmed.split(/\s+/);
    let caseNumber: string | undefined;
    let dateResult: { startDate: string; isAllDay: boolean } | null = null;
    const titleParts: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const clean = token.replace(/[\/\-]/g, '');

        // Case number
        if (!caseNumber && CASE_NUMBER_RE.test(clean)) {
            caseNumber = clean;
            continue;
        }

        if (!dateResult) {
            // 1. Whole numeric code
            const num = parseNumericToken(clean);
            if (num) {
                dateResult = num;
                continue;
            }

            // 2. Whole Chinese date token
            const ch = parseChineseToken(token);
            if (ch) {
                // Try to combine with next token for time (e.g. "5月4日" + "下午1點")
                if (ch.isAllDay && i + 1 < tokens.length) {
                    const combined = combineAdjacentTime(ch, tokens[i + 1]);
                    if (combined) {
                        dateResult = combined;
                        i++; // consume next token
                        continue;
                    }
                }
                dateResult = ch;
                continue;
            }

            // 3. Mixed: text + numeric code (e.g. "協議0504")
            const mixedNum = extractNumericFromMixed(clean);
            if (mixedNum) {
                dateResult = parseNumericToken(mixedNum.code)!;
                if (mixedNum.text.trim()) titleParts.push(mixedNum.text.trim());
                continue;
            }

            // 4. Mixed: text + Chinese date (e.g. "協議5月4日")
            const mixedCh = extractChineseFromMixed(token);
            if (mixedCh) {
                dateResult = parseChineseToken(mixedCh.dateToken)!;
                if (mixedCh.text.trim()) titleParts.push(mixedCh.text.trim());
                continue;
            }
        }

        titleParts.push(token);
    }

    const title = titleParts.join(' ').trim() || (caseNumber || dateResult ? '' : trimmed);
    return { title, startDate: dateResult?.startDate ?? null, isAllDay: dateResult?.isAllDay ?? false, caseNumber };
}

// ── 預覽格式化 ────────────────────────────────────────────────────────────────

export function formatPreview(parsed: ParsedEvent): string {
    if (!parsed.startDate) return '';
    try {
        if (parsed.isAllDay) {
            const d = new Date(parsed.startDate + 'T00:00');
            return `${d.getMonth() + 1}月${d.getDate()}日 全天`;
        }
        const d = new Date(parsed.startDate);
        const h = d.getHours();
        const ampm = h >= 12 ? '下午' : '上午';
        const h12 = h % 12 || 12;
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${d.getMonth() + 1}月${d.getDate()}日 ${ampm}${h12}:${min}`;
    } catch {
        return '';
    }
}
