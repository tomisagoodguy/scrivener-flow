import { format } from 'date-fns';
import type { DemoCase, Financials, Milestone } from '@/types';

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

export function buildTableSection(cases: DemoCase[]): string {
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
            <th>備註</th>
          </tr>
        </thead>
        <tbody>
    `;

    const rows = cases
        .map((c) => {
            const row = normalizeCaseRow(c);
            return `<tr>
        ${cell(row.caseNumber)}
        ${cell(row.district)}
        ${cell(row.buyerName)}
        ${cell(row.sellerName)}
        ${cell(row.priceBank)}
        ${cell(row.taxType)}
        ${cell(row.milestoneDates)}
        ${cell(row.todos)}
        ${cell(row.notes)}
      </tr>`;
        })
        .join('\n');

    return `${header}${rows}\n        </tbody>\n      </table>\n    </section>`;
}

export function buildMemoSection(cases: DemoCase[]): string {
    const cards = cases
        .map((c) => {
            const row = normalizeCaseRow(c);
            if (!hasMemoContent(row)) return '';
            const blocks = [
                buildMemoBlock('⚠️ 警示備註', row.notes, 'memo-warning'),
                buildMemoBlock('📝 其他備忘', row.pendingTasks, 'memo-pending'),
                buildMemoBlock('🔒 私密備註', row.privateNotes, 'memo-private'),
            ]
                .filter(Boolean)
                .join('\n');
            return `<div class="memo-card">
        <div class="memo-case-number">${escapeHtml(row.caseNumber)}</div>
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

export function buildTimelineSection(cases: DemoCase[], now: Date = new Date()): string {
    const entries = cases
        .map((c) => {
            const milestone = getUpcomingMilestone(c, now);
            if (!milestone) return null;
            return {
                caseNumber: c.case_number,
                label: milestone.label,
                date: milestone.date,
                sortKey: new Date(milestone.date).getTime(),
            };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort((a, b) => a.sortKey - b.sortKey);

    const items = entries
        .map(
            (e) =>
                `<div class="timeline-item">
          <span class="timeline-date">${escapeHtml(formatExportDate(e.date))}</span>
          <span class="timeline-case">${escapeHtml(e.caseNumber)}</span>
          <span class="timeline-milestone">${escapeHtml(e.label)}</span>
        </div>`
        )
        .join('\n');

    return `
    <section class="section">
      <h2>時程</h2>
      <div class="timeline-list">
        ${items || '<p class="empty">（無即將到來的里程碑）</p>'}
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
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
    color: #1e40af;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; background: #fff; }
  th, td { border: 1px solid #e2e8f0; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; white-space: nowrap; }
  tr:nth-child(even) { background: #f8fafc; }
  .memo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .memo-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .memo-case-number { font-weight: 700; color: #2563eb; margin-bottom: 0.5rem; }
  .memo-block { margin-top: 0.75rem; }
  .memo-block:first-of-type { margin-top: 0; }
  .memo-label { font-size: 0.75rem; font-weight: 700; margin-bottom: 0.25rem; }
  .memo-warning .memo-label { color: #e11d48; }
  .memo-pending .memo-label { color: #64748b; font-style: italic; }
  .memo-private .memo-label { color: #475569; }
  .memo-content { font-size: 0.9rem; white-space: pre-wrap; }
  .timeline-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .timeline-item {
    display: flex;
    gap: 1rem;
    align-items: center;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
  .timeline-date { font-weight: 700; color: #059669; min-width: 6rem; }
  .timeline-case { font-weight: 700; color: #2563eb; min-width: 5rem; }
  .timeline-milestone { color: #64748b; }
  .empty { color: #94a3b8; font-style: italic; }
`;

export function buildCasesHtml(cases: DemoCase[], exportedAt: Date = new Date()): string {
    const exportTime = format(exportedAt, 'yyyy/MM/dd HH:mm');
    const tableSection = buildTableSection(cases);
    const memoSection = buildMemoSection(cases);
    const timelineSection = buildTimelineSection(cases, exportedAt);

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
</body>
</html>`;
}
