import { format } from 'date-fns';
import type { DemoCase, Financials, Milestone } from '@/types';
import {
    MILESTONE_FIELDS,
    APPOINTMENT_FIELDS,
    TAX_DEADLINE_FIELDS,
} from '@/components/features/cases/timeline-hub/constants';
import {
    buildInteractiveScript,
    serializeInitialState,
    getExportEventId,
} from './exportInteractive';

const SIGNING_TODOS = [
    '買方蓋印章',
    '賣方蓋印章',
    '用印款',
    '完稅款',
    '權狀',
    '印鑑',
    '授權',
    '解約排除',
    '規費',
    '設定',
    '等稅單',
    '已繳稅單',
    '差額',
    '整過戶',
];

const TRANSFER_TODOS = [
    '整交屋',
    '實登',
    '打單',
    '履保',
    '水電',
    '稅費分算',
    '保單',
    '代償',
    '塗銷',
    '二撥',
];

const ALL_STANDARD_TASKS = [
    ...SIGNING_TODOS.map((t) => `S_${t}`),
    ...TRANSFER_TODOS.map((t) => `T_${t}`),
];

const MILESTONE_STEPS = [
    { label: '簽', field: 'contract_date' as const },
    { label: '印', field: 'seal_date' as const },
    { label: '稅', field: 'tax_payment_date' as const },
    { label: '過', field: 'transfer_date' as const },
    { label: '交', field: 'handover_date' as const },
];

/**
 * Highlight tokens that can be toggled per case in the `/cases` table: the five
 * milestone steps, the tax-type value, and the pre-collected-fee value. Their
 * localStorage keys are `highlight_<caseId>_<token>` with value `"true"`.
 */
const HIGHLIGHT_TOKENS = ['簽', '印', '稅', '過', '交', 'tax_type', 'pre_fee'] as const;

/** caseId → list of highlighted tokens (subset of {@link HIGHLIGHT_TOKENS}). */
export type CaseHighlightMap = Record<string, string[]>;

/** Map milestone field key → its highlight token (only the five milestones). */
const MILESTONE_FIELD_TOKEN: Record<string, string> = Object.fromEntries(
    MILESTONE_STEPS.map(({ label, field }) => [field, label])
);

/** Read a `highlight_*` flag from localStorage, guarded for non-browser use. */
function defaultHighlightRead(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * Collect the per-case highlight snapshot from the exporting user's local state.
 * Side effects (reading localStorage) are confined to the injectable `read`,
 * keeping the `build*` functions pure and testable. In a non-browser environment
 * the default `read` yields no flags, so the result is `{}`.
 */
export function collectCaseHighlights(
    cases: DemoCase[],
    read: (key: string) => string | null = defaultHighlightRead
): CaseHighlightMap {
    const map: CaseHighlightMap = {};
    cases.forEach((c) => {
        const tokens = HIGHLIGHT_TOKENS.filter(
            (token) => read(`highlight_${c.id}_${token}`) === 'true'
        );
        if (tokens.length) map[c.id] = tokens;
    });
    return map;
}

export interface NormalizedCaseRow {
    caseNumber: string;
    district: string;
    buyerName: string;
    sellerName: string;
    priceBank: string;
    taxType: string;
    contractDate: string;
    sealDate: string;
    taxPaymentDate: string;
    transferDate: string;
    handoverDate: string;
    milestoneDates: string;
    todos: string;
    notes: string;
    pendingTasks: string;
    privateNotes: string;
    preCollectedFee: string;
    totalPrice: string;
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getMilestone(c: DemoCase): Partial<Milestone> {
    return (Array.isArray(c.milestones) ? c.milestones[0] || {} : c.milestones || {}) as Partial<Milestone>;
}

function getFinancial(c: DemoCase): Partial<Financials> {
    return (Array.isArray(c.financials) ? c.financials[0] || {} : c.financials || {}) as Partial<Financials>;
}

export function formatExportDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
        return format(new Date(dateStr), 'yyyy/MM/dd');
    } catch {
        return dateStr;
    }
}

export function formatMoneyWan(val?: number | null): string {
    if (!val) return '';
    return String(val / 10000);
}

function buildPendingTodos(c: DemoCase): string {
    const existingTodos =
        c.todos && typeof c.todos === 'object' ? (c.todos as Record<string, boolean>) : {};

    const pendingStandard = ALL_STANDARD_TASKS.filter((t) => existingTodos[t] !== true);

    const pendingCustom = Object.keys(existingTodos).filter((key) => {
        if (ALL_STANDARD_TASKS.includes(key)) return false;
        if (existingTodos[key] === true) return false;
        if (!Number.isNaN(Number(key))) return false;
        if (key === 'S_權狀印鑑' || key === 'S_稅單') return false;
        return true;
    });

    return [...pendingStandard, ...pendingCustom]
        .map((task) => task.replace(/^(S_|T_)/, ''))
        .join(', ');
}

function buildParties(buyer: string, seller: string): string {
    return [buyer, seller].filter(Boolean).join(' / ');
}

function buildPriceBank(f: Partial<Financials>): string {
    const parts: string[] = [];
    if (f.total_price) parts.push(`總 ${f.total_price}萬`);
    if (f.buyer_bank) parts.push(`買 ${f.buyer_bank}`);
    if (f.seller_bank) parts.push(`賣 ${f.seller_bank}`);
    return parts.join(' / ');
}

function stripHtmlTags(html: string): string {
    if (!html) return '';
    if (!/<[a-z][\s\S]*>/i.test(html)) return html;
    return html
        .replace(/<\/p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function buildMemoBlock(label: string, content: string, cssClass: string): string {
    if (!content) return '';
    return `<div class="memo-block ${cssClass}">
        <div class="memo-label">${escapeHtml(label)}</div>
        <div class="memo-content">${escapeHtml(content)}</div>
      </div>`;
}

function hasMemoContent(row: NormalizedCaseRow): boolean {
    return !!(row.notes || row.pendingTasks || row.privateNotes);
}

function buildMilestoneDates(m: Partial<Milestone>): string {
    return MILESTONE_STEPS.map(({ label, field }) => {
        const d = m[field];
        return d ? `${label} ${formatExportDate(d)}` : '';
    })
        .filter(Boolean)
        .join(' ');
}

export function normalizeCaseRow(c: DemoCase): NormalizedCaseRow {
    const m = getMilestone(c);
    const f = getFinancial(c);

    const notes = stripHtmlTags((c.notes || '').replace(/\[\[ATTR:.*?\]\]/g, '').trim());
    const pendingTasks = stripHtmlTags((c.pending_tasks ?? '').trim());
    const privateNotes = stripHtmlTags((c.private_notes ?? '').trim());

    return {
        caseNumber: c.case_number,
        district: c.district || c.city || '',
        buyerName: c.buyer_name,
        sellerName: c.seller_name,
        priceBank: buildPriceBank(f),
        taxType: c.tax_type || '一般',
        contractDate: formatExportDate(m.contract_date),
        sealDate: formatExportDate(m.seal_date),
        taxPaymentDate: formatExportDate(m.tax_payment_date),
        transferDate: formatExportDate(m.transfer_date),
        handoverDate: formatExportDate(m.handover_date),
        milestoneDates: buildMilestoneDates(m),
        todos: buildPendingTodos(c),
        notes,
        pendingTasks,
        privateNotes,
        preCollectedFee: formatMoneyWan(f.pre_collected_fee),
        totalPrice: f.total_price ? String(f.total_price) : '',
    };
}

export function getUpcomingMilestone(
    c: DemoCase,
    now: Date = new Date()
): { label: string; date: string } | null {
    const m = getMilestone(c);
    const nowTime = now.getTime();

    const upcoming = MILESTONE_STEPS.map(({ label, field }) => ({
        label,
        date: m[field],
    }))
        .filter((s) => s.date)
        .map((s) => ({ ...s, time: new Date(s.date!).getTime() }))
        .filter((s) => s.time >= nowTime)
        .sort((a, b) => a.time - b.time)[0];

    if (!upcoming?.date) return null;
    return { label: upcoming.label, date: upcoming.date };
}

function cell(value: string): string {
    return `<td>${escapeHtml(value)}</td>`;
}

/** Render the milestone-dates cell as individual, individually-highlightable tokens. */
function buildMilestoneTokens(m: Partial<Milestone>, tokens: string[]): string {
    return MILESTONE_STEPS.map(({ label, field }) => {
        const d = m[field];
        if (!d) return '';
        const hl = tokens.includes(label) ? ' export-hl' : '';
        return `<span class="ms-token${hl}">${escapeHtml(`${label} ${formatExportDate(d)}`)}</span>`;
    })
        .filter(Boolean)
        .join(' ');
}

/** Render the tax cell: the tax-type value plus an optional pre-collected-fee token. */
function buildTaxTokens(row: NormalizedCaseRow, tokens: string[]): string {
    const parts: string[] = [];
    const taxHl = tokens.includes('tax_type') ? ' export-hl' : '';
    parts.push(`<span class="tax-token${taxHl}">${escapeHtml(row.taxType)}</span>`);
    if (row.preCollectedFee) {
        const feeHl = tokens.includes('pre_fee') ? ' export-hl' : '';
        parts.push(
            `<span class="tax-token${feeHl}">${escapeHtml(`預收 ${row.preCollectedFee}萬`)}</span>`
        );
    }
    return parts.join(' ');
}

export function buildTableSection(cases: DemoCase[], highlights: CaseHighlightMap = {}): string {
    const header = `
    <section class="section">
      <h2>承辦中表格</h2>
      <table>
        <thead>
          <tr>
            <th>案號</th>
            <th>地區</th>
            <th>買方</th>
            <th>賣方</th>
            <th>價格/銀行</th>
            <th>稅單性質</th>
            <th>里程碑日期</th>
            <th>未完成待辦</th>
          </tr>
        </thead>
        <tbody>
    `;

    const rows = cases
        .map((c) => {
            const row = normalizeCaseRow(c);
            const tokens = highlights[c.id] ?? [];
            const taxCell = buildTaxTokens(row, tokens);
            const milestoneCell = buildMilestoneTokens(getMilestone(c), tokens);
            return `<tr data-case-id="${escapeHtml(c.id)}">
        ${cell(row.caseNumber)}
        ${cell(row.district)}
        ${cell(row.buyerName)}
        ${cell(row.sellerName)}
        ${cell(row.priceBank)}
        <td>${taxCell}</td>
        <td>${milestoneCell}</td>
        ${cell(row.todos)}
      </tr>`;
        })
        .join('\n');

    return `${header}${rows}\n        </tbody>\n      </table>\n    </section>`;
}

export function buildMemoSection(cases: DemoCase[], now: Date = new Date()): string {
    const cards = cases
        .map((c) => {
            const row = normalizeCaseRow(c);
            if (!hasMemoContent(row)) return '';
            const upcoming = getUpcomingMilestone(c, now);
            const nextChip = upcoming
                ? `<span class="memo-next">${escapeHtml(upcoming.label)} ${escapeHtml(formatExportDate(upcoming.date))}</span>`
                : '';
            const parties = buildParties(row.buyerName, row.sellerName);
            const partiesLine = parties
                ? `<div class="memo-parties">${escapeHtml(parties)}</div>`
                : '';
            const blocks = [
                buildMemoBlock('⚠️ 警示備註', row.notes, 'memo-warning'),
                buildMemoBlock('📝 其他備忘', row.pendingTasks, 'memo-pending'),
                buildMemoBlock('🔒 私密備註', row.privateNotes, 'memo-private'),
            ]
                .filter(Boolean)
                .join('\n');
            return `<div class="memo-card" data-case-id="${escapeHtml(c.id)}">
        <div class="memo-card-head">
          <span class="memo-case-number">${escapeHtml(row.caseNumber)}</span>
          ${nextChip}
        </div>
        ${partiesLine}
        ${blocks}
      </div>`;
        })
        .filter(Boolean)
        .join('\n');

    return `
    <section class="section">
      <h2>備忘錄</h2>
      <div class="memo-grid">
        ${cards || '<p class="empty">（無備忘內容）</p>'}
      </div>
    </section>`;
}

interface ExportTimelineEvent {
    date: Date;
    icon: string;
    label: string;
    caseNumber: string;
    caseId: string;
    eventId: string;
    /** Source field key (e.g. 'seal_date'); absent for todo events. */
    fieldKey?: string;
    parties: string;
    content: string;
}

const WEEKDAY_TC = ['日', '一', '二', '三', '四', '五', '六'];

function startOfLocalDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function pushFieldEvents(
    events: ExportTimelineEvent[],
    fields: readonly { key: string; label: string; icon: string }[],
    source: Record<string, unknown>,
    caseId: string,
    caseNumber: string,
    parties: string,
    withTime: boolean
): void {
    fields.forEach((field) => {
        const raw = source[field.key];
        if (typeof raw !== 'string' || !raw) return;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return;
        const content = withTime && raw.includes('T') ? `⏰ ${format(d, 'HH:mm')}` : '';
        events.push({
            date: d,
            icon: field.icon,
            label: field.label,
            caseNumber,
            caseId,
            eventId: getExportEventId({ caseId, fieldKey: field.key }),
            fieldKey: field.key,
            parties,
            content,
        });
    });
}

export function collectTimelineEvents(cases: DemoCase[]): ExportTimelineEvent[] {
    const events: ExportTimelineEvent[] = [];

    cases.forEach((c) => {
        const m = getMilestone(c) as unknown as Record<string, unknown>;
        const f = getFinancial(c) as unknown as Record<string, unknown>;
        const parties = buildParties(c.buyer_name, c.seller_name);

        pushFieldEvents(events, MILESTONE_FIELDS, m, c.id, c.case_number, parties, false);
        pushFieldEvents(events, APPOINTMENT_FIELDS, m, c.id, c.case_number, parties, true);
        pushFieldEvents(events, TAX_DEADLINE_FIELDS, f, c.id, c.case_number, parties, false);

        (c.todos_list ?? []).forEach((todo) => {
            if (todo.is_deleted || todo.is_completed || !todo.due_date) return;
            const d = new Date(todo.due_date);
            if (Number.isNaN(d.getTime())) return;
            const time = todo.due_date.includes('T') ? `⏰ ${format(d, 'HH:mm')}　` : '';
            events.push({
                date: d,
                icon: '📝',
                label: '待辦',
                caseNumber: c.case_number,
                caseId: c.id,
                eventId: getExportEventId({ caseId: c.id, todoId: todo.id }),
                parties,
                content: `${time}${todo.content ?? ''}`.trim(),
            });
        });
    });

    return events;
}

function buildDayHeaderLabel(date: Date, today: Date): string {
    const diff = Math.round((startOfLocalDay(date).getTime() - today.getTime()) / 86400000);
    const md = `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAY_TC[date.getDay()]}）`;
    if (diff === 0) return `今天　${md}`;
    if (diff === 1) return `明天　${md}`;
    if (diff > 1 && diff <= 7) return `${diff}天後　${md}`;
    return md;
}

export function buildTimelineSection(
    cases: DemoCase[],
    now: Date = new Date(),
    highlights: CaseHighlightMap = {}
): string {
    const today = startOfLocalDay(now);

    const upcoming = collectTimelineEvents(cases)
        .filter((e) => startOfLocalDay(e.date).getTime() >= today.getTime())
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const groups = new Map<string, { date: Date; events: ExportTimelineEvent[] }>();
    upcoming.forEach((e) => {
        const dayStart = startOfLocalDay(e.date);
        const key = format(dayStart, 'yyyy-MM-dd');
        if (!groups.has(key)) groups.set(key, { date: dayStart, events: [] });
        groups.get(key)!.events.push(e);
    });

    const todayKey = format(today, 'yyyy-MM-dd');
    const dayBlocks = Array.from(groups.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((g) => {
            const dayKey = format(g.date, 'yyyy-MM-dd');
            const isToday = dayKey === todayKey;
            const header = `<div class="timeline-day${isToday ? ' timeline-day-today' : ''}" data-day="${escapeHtml(dayKey)}">${escapeHtml(buildDayHeaderLabel(g.date, today))}<span class="timeline-day-count">${g.events.length} 件</span></div>`;
            const rows = g.events
                .map((e) => {
                    const partiesSpan = e.parties
                        ? `<span class="timeline-parties">${escapeHtml(e.parties)}</span>`
                        : '';
                    const contentSpan = e.content
                        ? `<span class="timeline-content">${escapeHtml(e.content)}</span>`
                        : '';
                    const eventDate = format(e.date, 'yyyy-MM-dd');
                    const token = e.fieldKey ? MILESTONE_FIELD_TOKEN[e.fieldKey] : undefined;
                    const isHl = !!token && (highlights[e.caseId] ?? []).includes(token);
                    const hlClass = isHl ? ' export-hl' : '';
                    const hlAttr = isHl ? ' data-hl="1"' : '';
                    return `<div class="timeline-item${hlClass}" data-event-id="${escapeHtml(e.eventId)}" data-event-date="${escapeHtml(eventDate)}" data-case-id="${escapeHtml(e.caseId)}"${hlAttr}>
          <span class="timeline-icon">${e.icon}</span>
          <span class="timeline-label">${escapeHtml(e.label)}</span>
          <span class="timeline-case">${escapeHtml(e.caseNumber)}</span>
          ${partiesSpan}
          ${contentSpan}
        </div>`;
                })
                .join('\n');
            return `<div class="timeline-day-group">\n${header}\n${rows}\n</div>`;
        })
        .join('\n');

    return `
    <section class="section">
      <h2>時程</h2>
      <div class="timeline-list">
        ${dayBlocks || '<p class="empty">（無即將到來的事項）</p>'}
      </div>
    </section>`;
}

const INLINE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif;
    background: #f8fafc;
    color: #1e293b;
    padding: 2rem;
    line-height: 1.5;
  }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { font-size: 0.85rem; color: #64748b; margin-bottom: 2rem; }
  .section { margin-bottom: 2.5rem; }
  .section h2 {
    font-size: 1.1rem;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
    color: #1d4ed8;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; background: #fff; }
  th, td { border: 1px solid #e2e8f0; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
  th { background: #eff6ff; color: #1d4ed8; font-weight: 700; white-space: nowrap; }
  tr:nth-child(even) { background: #f8fafc; }
  .memo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .memo-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .memo-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }
  .memo-case-number { font-weight: 700; color: #2563eb; }
  .memo-next {
    font-size: 0.75rem;
    font-weight: 700;
    color: #2563eb;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 9999px;
    padding: 0.1rem 0.55rem;
    white-space: nowrap;
  }
  .memo-parties {
    font-size: 0.8rem;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .memo-block { margin-top: 0.75rem; }
  .memo-block:first-of-type { margin-top: 0; }
  .memo-label { font-size: 0.75rem; font-weight: 700; margin-bottom: 0.25rem; }
  .memo-warning .memo-label { color: #e11d48; }
  .memo-pending .memo-label { color: #64748b; font-style: italic; }
  .memo-private .memo-label { color: #475569; }
  .memo-content { font-size: 0.9rem; white-space: pre-wrap; }
  /* 收合：螢幕只藏內容節點，保留標籤列與「展開」鈕可見可點（互動層注入 export-collapsed） */
  .memo-block.export-collapsed .memo-content { display: none; }
  /* 兩欄並排日群組：橫向利用寬度、縱向高度約減半。每個日群組為一個原子
     grid item（含邊框與圓角），break-inside: avoid 避免被切到不同欄。 */
  .timeline-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    align-items: start;
  }
  .timeline-day-group {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    break-inside: avoid;
  }
  .timeline-day {
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    font-size: 0.8rem;
    padding: 0.3rem 0.7rem;
    border-bottom: 1px solid #e2e8f0;
  }
  .timeline-day-today { background: #eff6ff; color: #1d4ed8; }
  .timeline-day-count { font-weight: 400; opacity: 0.6; margin-left: 0.4rem; }
  .timeline-item {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    padding: 0.25rem 0.7rem;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.8rem;
    text-align: left;
  }
  .timeline-icon { width: 1.1rem; text-align: center; flex-shrink: 0; }
  .timeline-label { width: 3rem; flex-shrink: 0; color: #64748b; font-size: 0.74rem; }
  .timeline-case { font-weight: 700; color: #2563eb; flex-shrink: 0; min-width: 4.5rem; }
  .timeline-parties { color: #64748b; font-weight: 600; }
  .timeline-content { color: #94a3b8; font-size: 0.76rem; }
  /* 里程碑 / 稅單 / 預收 token：行內標籤，未高亮時不佔額外視覺重量 */
  .ms-token, .tax-token {
    display: inline-block;
    padding: 0 0.25rem;
    border-radius: 4px;
    border: 1px solid transparent;
  }
  /* 匯出黃底高亮（對應主 App amber-200/900/300），表格 token 與時程事件共用 */
  .export-hl { background: #fde68a; color: #78350f; border-color: #fcd34d; }
  .empty { color: #94a3b8; font-style: italic; padding: 0.5rem 1rem; display: block; }
  /* ── 互動層（JS 注入後才出現）─────────────────────────── */
  .export-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .export-filterbar { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .export-filter-chip { display: inline-flex; align-items: center; gap: 0.15rem; }
  .export-filter-del {
    font-size: 0.75rem;
    line-height: 1;
    padding: 0.15rem 0.4rem;
    border: 1px solid #fecdd3;
    background: #fff;
    color: #e11d48;
    border-radius: 9999px;
    cursor: pointer;
  }
  .export-filter-del:hover { background: #fff1f2; }
  .export-filter-btn {
    font-size: 0.8rem;
    padding: 0.25rem 0.7rem;
    border: 1px solid #bfdbfe;
    background: #fff;
    color: #1d4ed8;
    border-radius: 9999px;
    cursor: pointer;
  }
  .export-filter-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
  .export-people-add { display: flex; gap: 0.35rem; }
  .export-add-input {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    min-width: 8rem;
  }
  .export-add-btn, .export-download {
    font-size: 0.8rem;
    padding: 0.25rem 0.7rem;
    border: 1px solid #2563eb;
    background: #eff6ff;
    color: #1d4ed8;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
  }
  .export-download { margin-left: auto; font-weight: 700; }
  .export-item-controls {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .export-assignee {
    font-size: 0.78rem;
    padding: 0.1rem 0.3rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #1e293b;
    background: #fff;
  }
  .export-done {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.75rem;
    color: #64748b;
    cursor: pointer;
    white-space: nowrap;
  }
  .timeline-item.export-item-done { opacity: 0.5; }
  .timeline-item.export-item-done .timeline-case,
  .timeline-item.export-item-done .timeline-content { text-decoration: line-through; }
  /* 案件層級承辦人：表格指派欄與徽章（表格 + 備忘錄） */
  .export-row-assignee-cell { white-space: nowrap; }
  .export-row-assignee-cell .export-assignee { margin-bottom: 0.25rem; }
  .export-assignee-badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    color: #1d4ed8;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 9999px;
    padding: 0.05rem 0.5rem;
    white-space: nowrap;
  }
  .memo-card-head .export-memo-badge { margin-left: auto; }
  /* 備忘錄收合：逐張切換鈕 + 頂部分類全域開關（JS 注入後才出現） */
  .memo-label .export-memo-collapse {
    margin-left: 0.4rem;
    font-size: 0.68rem;
    padding: 0.02rem 0.4rem;
    border: 1px solid #cbd5e1;
    background: #fff;
    color: #475569;
    border-radius: 9999px;
    cursor: pointer;
    vertical-align: middle;
  }
  .memo-label .export-memo-collapse:hover { background: #f1f5f9; }
  .export-memo-switch { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
  .export-memo-collapse-all {
    font-size: 0.78rem;
    padding: 0.25rem 0.7rem;
    border: 1px solid #bfdbfe;
    background: #fff;
    color: #1d4ed8;
    border-radius: 9999px;
    cursor: pointer;
  }
  .export-memo-collapse-all:hover { background: #eff6ff; }
  /* ── 時程檢視切換 + 週曆／議程式（JS 注入後才出現）──────────── */
  .export-view-switch { display: inline-flex; gap: 0.35rem; margin-bottom: 0.75rem; }
  .export-view-btn {
    font-size: 0.8rem;
    padding: 0.25rem 0.8rem;
    border: 1px solid #bfdbfe;
    background: #fff;
    color: #1d4ed8;
    border-radius: 9999px;
    cursor: pointer;
  }
  .export-view-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
  .week-agenda {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  /* 7 欄月曆方格：每週一列 .week-grid（週一～週日），每格一天 .week-cell。
     空白日為空的小方格、不佔整列；事件以緊湊 chip 呈現。 */
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    border-bottom: 2px solid #cbd5e1;
  }
  .week-grid:last-child { border-bottom: none; }
  .week-cell {
    min-height: 3.5rem;
    padding: 0.3rem;
    border-right: 1px solid #f1f5f9;
    break-inside: avoid;
  }
  .week-cell:nth-child(7n) { border-right: none; }
  .week-cell-today { background: #eff6ff; }
  .week-cell-date {
    font-size: 0.7rem;
    font-weight: 700;
    color: #475569;
    margin-bottom: 0.2rem;
  }
  .week-cell-today .week-cell-date { color: #1d4ed8; }
  .week-event {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.2rem;
    font-size: 0.72rem;
    margin-bottom: 0.2rem;
    text-align: left;
  }
  .week-event .timeline-icon { width: auto; flex-shrink: 0; }
  .week-event .timeline-label { width: auto; flex-shrink: 0; color: #64748b; font-size: 0.66rem; }
  .week-event .timeline-parties { font-weight: 700; color: #1e293b; }
  .week-event .export-done { margin-left: auto; font-size: 0.66rem; }
  .week-event.export-item-done { opacity: 0.5; }
  .week-event.export-item-done .timeline-parties { text-decoration: line-through; }
  /* ── 紙本列印（僅列印情境生效，不影響螢幕與互動）──────────── */
  @media print {
    /* 互動層注入節點一律帶 export-ui，列印時全部隱藏 */
    .export-ui { display: none !important; }
    /* 收合區塊列印時整塊隱藏（含已空的標籤標題）；展開鈕本身為 export-ui 已隱藏 */
    .memo-block.export-collapsed { display: none; }
    /* 週曆檢視會以 inline display:none 藏起靜態條列時程，列印時強制復原為
       兩欄 grid（非 block），否則切到週曆後列印整段時程會空白，且高密度兩欄
       版面也要保留於紙本（週曆容器本身已被上面隱藏） */
    .timeline-list { display: grid !important; }
    /* 邊距交由 @page，移除螢幕用的 body padding */
    @page { margin: 1.5cm; }
    body { padding: 0; background: #fff; }
    /* 大面積底色改邊框+粗體，避免去背景後界線消失、並省墨 */
    th {
      background: #fff;
      border: 1px solid #94a3b8;
      font-weight: 700;
    }
    tr:nth-child(even) { background: #fff; }
    .memo-card,
    .timeline-list {
      box-shadow: none;
      border: 1px solid #94a3b8;
    }
    .timeline-day {
      background: #fff;
      border-bottom: 1px solid #94a3b8;
      font-weight: 700;
    }
    /* 關鍵小標示保留底色（強制套用，跨瀏覽器） */
    .timeline-day-today,
    .memo-warning,
    .export-hl {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    /* 避免換頁／跨欄切斷：日群組與月曆方格皆為原子單位 */
    .section,
    .timeline-day-group,
    .timeline-day,
    .timeline-item,
    .week-grid,
    .week-cell,
    .memo-card,
    tr { break-inside: avoid; }
    /* 長表格跨頁重複表頭 */
    thead { display: table-header-group; }
  }
`;

export function buildCasesHtml(
    cases: DemoCase[],
    exportedAt: Date = new Date(),
    highlights: CaseHighlightMap = {}
): string {
    const exportTime = format(exportedAt, 'yyyy/MM/dd HH:mm');
    const tableSection = buildTableSection(cases, highlights);
    const memoSection = buildMemoSection(cases, exportedAt);
    const timelineSection = buildTimelineSection(cases, exportedAt, highlights);
    const initialState = serializeInitialState();

    return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>案件清單</title>
  <style>${INLINE_CSS}</style>
</head>
<body>
  <h1>案件清單</h1>
  <p class="meta">匯出時間：${escapeHtml(exportTime)}　共 ${cases.length} 件</p>
  ${tableSection}
  ${memoSection}
  ${timelineSection}
  <script type="application/json" id="export-state">${initialState}</script>
  ${buildInteractiveScript(initialState)}
</body>
</html>`;
}
