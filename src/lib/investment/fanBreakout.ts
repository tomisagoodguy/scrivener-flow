/**
 * 均線發散候選（fan_breakout）的前端純計算模組。
 *
 * 型別、conditions 解析、訊號後績效、篩選、排序與分頁都放這裡，
 * 供 server action `getFanBreakoutSignals()` 與候選頁共用（單一事實來源）。
 * 契約見 openspec/changes/fan-breakout-screener/design.md（Implementation Contract）。
 */

export type FanBreakoutSignalType = 'first' | 'repeat';
export type FanBreakoutMarket = '上市' | '上櫃';

export interface FanBreakoutRow {
    /** 訊號日 YYYY-MM-DD */
    date: string;
    stockId: string;
    name: string;
    /** 寫入當日 spread（design D5）；DB 欄位可為 null */
    score: number | null;
    signalType: FanBreakoutSignalType | null;
    consecDays: number | null;
    spread: number | null;
    market: FanBreakoutMarket | null;
    /** 近 120 個交易日內所有入選日，遞增 */
    recentSignalDates: string[];
    /** 以下為未還原收盤價計算；缺資料為 null */
    signalClose: number | null;
    latestClose: number | null;
    latestDate: string | null;
    returnSinceSignal: number | null;
    highSinceSignal: number | null;
    lowSinceSignal: number | null;
}

export interface FanBreakoutResult {
    rows: FanBreakoutRow[];
    /** rows 中最新的訊號日；無資料為 null */
    latestDate: string | null;
    /** 查詢失敗時才有；此時 rows 為 [] */
    error?: string;
}

export type FanBreakoutConditions = Pick<
    FanBreakoutRow,
    'signalType' | 'consecDays' | 'spread' | 'market' | 'recentSignalDates'
>;

export type FanBreakoutPerformance = Pick<
    FanBreakoutRow,
    'signalClose' | 'latestClose' | 'latestDate' | 'returnSinceSignal' | 'highSinceSignal' | 'lowSinceSignal'
>;

/** stock_prices_daily 的一根日 K（未還原） */
export interface DailyPrice {
    date: string;
    high: number | null;
    low: number | null;
    close: number | null;
}

export interface FanBreakoutFilters {
    /** 含；null 或空字串＝不設下限 */
    dateFrom: string | null;
    /** 含；null 或空字串＝不設上限 */
    dateTo: string | null;
    signalType: 'all' | FanBreakoutSignalType;
    /** consecDays 下限；<= 1 視為不篩選（consecDays 最小為 1） */
    minConsecDays: number;
    market: 'all' | FanBreakoutMarket;
}

export const DEFAULT_FAN_BREAKOUT_FILTERS: FanBreakoutFilters = {
    dateFrom: null,
    dateTo: null,
    signalType: 'all',
    minConsecDays: 1,
    market: 'all',
};

export const FAN_BREAKOUT_PAGE_SIZE = 20;

/** 訊號類型的顯示文字（表格、篩選列、連續看圖、策略圖表頁共用） */
export const FAN_BREAKOUT_SIGNAL_LABEL: Record<FanBreakoutSignalType, string> = { first: '首次', repeat: '再次' };

/** 帶正負號的百分比（0.1234 → "+12.3%"，0 → "0.0%"）；value 為小數比例。 */
export function formatSignedPct(value: number, digits = 1): string {
    return `${value > 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
}

export interface Page<T> {
    items: T[];
    /** 夾進 [1, totalPages] 後的實際頁碼 */
    page: number;
    /** 至少為 1（無資料時仍是 1 頁、0 筆） */
    totalPages: number;
    total: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isSignalType(value: unknown): value is FanBreakoutSignalType {
    return value === 'first' || value === 'repeat';
}

function isMarket(value: unknown): value is FanBreakoutMarket {
    return value === '上市' || value === '上櫃';
}

function emptyConditions(): FanBreakoutConditions {
    return { signalType: null, consecDays: null, spread: null, market: null, recentSignalDates: [] };
}

/**
 * 解析 strategy_signals.conditions（可能是物件、JSON 字串或 null）。
 * 每個欄位獨立驗證，不合法回 null／空陣列；永不丟例外。
 */
export function parseFanBreakoutConditions(raw: unknown): FanBreakoutConditions {
    let value: unknown = raw;
    if (typeof raw === 'string') {
        try {
            value = JSON.parse(raw);
        } catch {
            // 字串不是合法 JSON：視同沒有中繼資料，各欄位回 null／空陣列
            return emptyConditions();
        }
    }
    if (!isRecord(value)) return emptyConditions();

    const consec = value.consec_days;
    const dates = value.recent_signal_dates;

    return {
        signalType: isSignalType(value.signal_type) ? value.signal_type : null,
        consecDays: isFiniteNumber(consec) && Number.isInteger(consec) && consec >= 1 ? consec : null,
        spread: isFiniteNumber(value.spread) ? value.spread : null,
        market: isMarket(value.market) ? value.market : null,
        recentSignalDates: Array.isArray(dates)
            ? dates.filter((d): d is string => typeof d === 'string' && ISO_DATE_RE.test(d))
            : [],
    };
}

/** 消除浮點誤差（112/100 − 1 = 0.12000000000000011），保留 6 位小數。 */
function roundReturn(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

function emptyPerformance(): FanBreakoutPerformance {
    return {
        signalClose: null,
        latestClose: null,
        latestDate: null,
        returnSinceSignal: null,
        highSinceSignal: null,
        lowSinceSignal: null,
    };
}

/**
 * 訊號後績效（未還原價）。
 * - 訊號日收盤缺失（無該日列、close 為 null 或 0）→ 全部 null。
 * - latestClose／latestDate：訊號日（含）之後最新一筆有收盤價的列。
 * - high／low：訊號日至 latestDate（含）所有列的最高價／最低價，null 價位略過。
 */
export function computePerformance(prices: DailyPrice[], signalDate: string): FanBreakoutPerformance {
    const bars = prices.filter((p) => p.date >= signalDate).sort((a, b) => a.date.localeCompare(b.date));

    const signalClose = bars.find((p) => p.date === signalDate)?.close;
    if (!isFiniteNumber(signalClose) || signalClose === 0) return emptyPerformance();

    // signalClose 有效，故 latest 至少是訊號日本身
    let latestClose = signalClose;
    let latestDate = signalDate;
    for (const bar of bars) {
        if (isFiniteNumber(bar.close)) {
            latestClose = bar.close;
            latestDate = bar.date;
        }
    }

    let high: number | null = null;
    let low: number | null = null;
    for (const bar of bars) {
        if (bar.date > latestDate) break;
        if (isFiniteNumber(bar.high) && (high === null || bar.high > high)) high = bar.high;
        if (isFiniteNumber(bar.low) && (low === null || bar.low < low)) low = bar.low;
    }

    return {
        signalClose,
        latestClose,
        latestDate,
        returnSinceSignal: roundReturn(latestClose / signalClose - 1),
        highSinceSignal: high,
        lowSinceSignal: low,
    };
}

/** 預設排序：訊號日新到舊、同日 score 大到小（null 排後）、再依代號穩定排序。 */
export function sortFanBreakoutRows(rows: FanBreakoutRow[]): FanBreakoutRow[] {
    return [...rows].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        const sa = a.score ?? Number.NEGATIVE_INFINITY;
        const sb = b.score ?? Number.NEGATIVE_INFINITY;
        if (sa !== sb) return sb > sa ? 1 : -1;
        return a.stockId.localeCompare(b.stockId);
    });
}

/**
 * 依篩選條件過濾（保留原順序、不改動輸入）。
 * conditions 缺漏（signalType／market 為 null）的列只在對應篩選為「全部」時保留；
 * consecDays 為 null 的列只在 minConsecDays <= 1（等同未篩選）時保留。
 */
export function filterRows(rows: FanBreakoutRow[], filters: FanBreakoutFilters): FanBreakoutRow[] {
    const { dateFrom, dateTo, signalType, minConsecDays, market } = filters;
    return rows.filter((row) => {
        if (dateFrom && row.date < dateFrom) return false;
        if (dateTo && row.date > dateTo) return false;
        if (signalType !== 'all' && row.signalType !== signalType) return false;
        if (market !== 'all' && row.market !== market) return false;
        if (minConsecDays > 1 && (row.consecDays === null || row.consecDays < minConsecDays)) return false;
        return true;
    });
}

/**
 * 每檔股票只保留輸入順序中第一次出現的列（不改動輸入）。
 * 輸入為訊號日新到舊時，結果即每股最新訊號列。
 */
export function latestRowPerStock(rows: FanBreakoutRow[]): FanBreakoutRow[] {
    const seen = new Set<string>();
    const out: FanBreakoutRow[] = [];
    for (const row of rows) {
        if (seen.has(row.stockId)) continue;
        seen.add(row.stockId);
        out.push(row);
    }
    return out;
}

/** 取第 page 頁（1 起算，超出範圍夾回）；改篩選回第 1 頁由呼叫端處理。 */
export function paginate<T>(rows: T[], page: number, pageSize: number = FAN_BREAKOUT_PAGE_SIZE): Page<T> {
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const requested = Number.isFinite(page) ? Math.trunc(page) : 1;
    const current = Math.min(Math.max(requested, 1), totalPages);
    const start = (current - 1) * pageSize;
    return { items: rows.slice(start, start + pageSize), page: current, totalPages, total };
}
