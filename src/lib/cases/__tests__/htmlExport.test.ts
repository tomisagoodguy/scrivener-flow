/**
 * Tests for cases HTML export.
 *
 * TDD: Written BEFORE implementation. Covers the spec scenarios of
 * "cases-html-export":
 *   - Reuse existing case data normalization rules (relational arrays, pending
 *     todos filtering, notes cleaning, money formatting)
 *   - HTML output escapes user-provided content
 *   - HTML output contains table, memo, and timeline sections
 *   - Self-contained document (lang/charset, inline CSS, no external resources)
 */

import {
    escapeHtml,
    normalizeCaseRow,
    getUpcomingMilestone,
    buildTableSection,
    buildMemoSection,
    buildTimelineSection,
    buildCasesHtml,
} from '@/lib/cases/htmlExport';
import type { DemoCase } from '@/types';

function makeCase(partial: Partial<DemoCase>): DemoCase {
    return {
        id: 'id-1',
        case_number: 'A-001',
        buyer_name: '王小明',
        seller_name: '李大華',
        ...partial,
    } as DemoCase;
}

describe('escapeHtml', () => {
    it('escapes < > & and double quotes literally', () => {
        expect(escapeHtml('<b>"a" & b</b>')).toBe(
            '&lt;b&gt;&quot;a&quot; &amp; b&lt;/b&gt;'
        );
    });

    it('returns empty string for empty input', () => {
        expect(escapeHtml('')).toBe('');
    });
});

describe('normalizeCaseRow', () => {
    it('uses the first element of milestones/financials arrays', () => {
        const c = makeCase({
            milestones: [{ contract_date: '2026-06-01' }] as DemoCase['milestones'],
            financials: [{ total_price: 1500 }] as DemoCase['financials'],
        });
        const row = normalizeCaseRow(c);
        expect(row.contractDate).toBe('2026/06/01');
        expect(row.totalPrice).toBe('1500');
    });

    it('filters pending todos: strips S_/T_, excludes completed, numeric, and legacy keys', () => {
        const c = makeCase({
            todos: {
                S_用印款: true, // completed → excluded
                S_完稅款: false, // pending → included as 完稅款
                T_履保: false, // pending custom-prefixed standard → included as 履保
                S_權狀印鑑: false, // legacy → excluded
                S_稅單: false, // legacy → excluded
                '123': false, // numeric → excluded
                自訂事項: false, // custom pending → included
            },
        });
        const row = normalizeCaseRow(c);
        const todos = row.todos.split(', ');
        expect(todos).toContain('完稅款');
        expect(todos).toContain('履保');
        expect(todos).toContain('自訂事項');
        expect(todos).not.toContain('用印款');
        expect(todos).not.toContain('權狀印鑑');
        expect(todos).not.toContain('稅單');
        expect(row.todos).not.toContain('123');
    });

    it('strips [[ATTR:...]] marker from notes and converts 預收規費 to 萬元', () => {
        const c = makeCase({
            notes: '注意產權 [[ATTR:{"x":1}]]',
            financials: [{ pre_collected_fee: 30000 }] as DemoCase['financials'],
        });
        const row = normalizeCaseRow(c);
        expect(row.notes).toBe('注意產權');
        expect(row.preCollectedFee).toBe('3');
    });
});

describe('getUpcomingMilestone', () => {
    const now = new Date('2026-06-10T00:00:00');

    it('returns the earliest future milestone with its label', () => {
        const c = makeCase({
            milestones: [
                {
                    seal_date: '2026-06-20',
                    tax_payment_date: '2026-06-15',
                    transfer_date: '2026-05-01', // past → ignored
                },
            ] as DemoCase['milestones'],
        });
        expect(getUpcomingMilestone(c, now)).toEqual({ label: '稅', date: '2026-06-15' });
    });

    it('returns null when no future milestone exists', () => {
        const c = makeCase({
            milestones: [{ contract_date: '2026-01-01' }] as DemoCase['milestones'],
        });
        expect(getUpcomingMilestone(c, now)).toBeNull();
    });
});

describe('buildTableSection', () => {
    it('lists each case and escapes user-provided content', () => {
        const html = buildTableSection([
            makeCase({ case_number: 'B-002', buyer_name: '陳<x>', district: '中山' }),
        ]);
        expect(html).toContain('案號');
        expect(html).toContain('未完成待辦');
        expect(html).toContain('B-002');
        expect(html).toContain('陳&lt;x&gt;');
        expect(html).not.toContain('陳<x>');
    });

    it('tags each row with its case id for the interactive layer', () => {
        const html = buildTableSection([
            makeCase({ id: 'case-xyz', case_number: 'B-002' }),
        ]);
        expect(html).toMatch(/<tr data-case-id="case-xyz">/);
    });
});

describe('buildMemoSection', () => {
    it('renders only cases whose memo content is non-empty', () => {
        const html = buildMemoSection([
            makeCase({ case_number: 'HAS-MEMO', notes: '重要備註' }),
            makeCase({ case_number: 'NO-MEMO', notes: '' }),
        ]);
        expect(html).toContain('HAS-MEMO');
        expect(html).toContain('重要備註');
        expect(html).not.toContain('NO-MEMO');
    });

    it('includes private notes and other memo fields', () => {
        const html = buildMemoSection([
            makeCase({
                case_number: 'PRIVATE-01',
                private_notes: '僅內部可見',
            }),
            makeCase({
                case_number: 'PENDING-01',
                pending_tasks: '記得追銀行',
            }),
        ]);
        expect(html).toContain('PRIVATE-01');
        expect(html).toContain('🔒 私密備註');
        expect(html).toContain('僅內部可見');
        expect(html).toContain('PENDING-01');
        expect(html).toContain('📝 其他備忘');
        expect(html).toContain('記得追銀行');
    });

    it('tags each memo card with its case id for the interactive layer', () => {
        const html = buildMemoSection([
            makeCase({ id: 'case-memo', case_number: 'MEMO-01', notes: '備註' }),
        ]);
        expect(html).toMatch(/<div class="memo-card" data-case-id="case-memo">/);
    });
});

describe('buildTimelineSection', () => {
    const now = new Date('2026-06-10T00:00:00');

    it('orders cases by their next upcoming milestone date', () => {
        const html = buildTimelineSection(
            [
                makeCase({
                    case_number: 'LATER',
                    milestones: [{ handover_date: '2026-07-01' }] as DemoCase['milestones'],
                }),
                makeCase({
                    case_number: 'SOONER',
                    milestones: [{ seal_date: '2026-06-12' }] as DemoCase['milestones'],
                }),
            ],
            now
        );
        expect(html.indexOf('SOONER')).toBeLessThan(html.indexOf('LATER'));
    });
});

describe('buildCasesHtml', () => {
    it('produces a self-contained document with no external resources', () => {
        const html = buildCasesHtml([makeCase({ notes: '備註' })]);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toMatch(/lang="zh-Hant"/);
        expect(html.toLowerCase()).toContain('charset="utf-8"');
        expect(html).toContain('<style>');
        // No external stylesheets / scripts / fonts
        expect(html).not.toMatch(/src="https?:/);
        expect(html).not.toMatch(/href="https?:/);
        expect(html).not.toContain('@import');
    });

    it('embeds the interactive state node and script without breaking self-containment', () => {
        const html = buildCasesHtml([
            makeCase({
                id: 'INT-01',
                case_number: 'INT-01',
                notes: '備註',
                milestones: [{ seal_date: '2026-06-20' }] as DemoCase['milestones'],
            }),
        ]);
        // interactive state node + enhancement script are present
        expect(html).toContain('<script type="application/json" id="export-state">');
        expect(html).toContain('{"people":[],"assignments":{},"done":{}}');
        expect(html).toMatch(/<script>[\s\S]*export-state[\s\S]*<\/script>/);
        // timeline events carry stable data attributes for the interactive layer
        expect(html).toContain('data-event-id="');
        expect(html).toContain('data-event-date="');
        expect(html).toContain('data-case-id="');
        expect(html).toContain('data-day="');
        // table rows and memo cards also carry case ids for cross-section sync
        expect(html).toMatch(/<tr data-case-id="INT-01">/);
        expect(html).toMatch(/<div class="memo-card" data-case-id="INT-01">/);
        // still fully self-contained: no external resources pulled in
        expect(html).not.toMatch(/src="https?:/);
        expect(html).not.toMatch(/href="https?:/);
        expect(html).not.toContain('@import');
    });

    it('keeps the static timeline output as the list view with no injected week-agenda', () => {
        const html = buildCasesHtml([
            makeCase({
                id: 'WK-01',
                case_number: 'WK-01',
                milestones: [{ seal_date: '2026-06-20' }] as DemoCase['milestones'],
            }),
        ]);
        // static output is the day-grouped list, not a week-agenda container
        expect(html).toContain('<div class="timeline-list">');
        expect(html).not.toContain('class="export-ui week-agenda"');
        expect(html).not.toMatch(/<button[^>]*class="[^"]*export-view-btn/);
        // self-contained still holds
        expect(html).not.toMatch(/src="https?:/);
        expect(html).not.toMatch(/href="https?:/);
        expect(html).not.toContain('@import');
    });

    it('hides collapsed memo content on screen but keeps the toggle reachable, and hides the whole block in print', () => {
        const html = buildCasesHtml([makeCase({ notes: '備註' })]);
        const printIdx = html.indexOf('@media print');
        const screenCss = html.slice(0, printIdx);
        const printBlock = html.slice(printIdx);

        // Screen: collapse hides only the .memo-content node, so the label row
        // (which carries the export-ui 展開 toggle) stays visible and clickable.
        expect(screenCss).toMatch(
            /\.memo-block\.export-collapsed\s+\.memo-content\s*\{[^}]*display:\s*none/
        );
        // Screen must NOT hide the whole .memo-block (that would bury the toggle).
        expect(screenCss).not.toMatch(/\.memo-block\.export-collapsed\s*\{[^}]*display:\s*none/);

        // Print: the whole collapsed block (incl. its now-empty header) is hidden;
        // the toggle is export-ui so it is hidden when printing regardless.
        expect(printBlock).toMatch(/\.memo-block\.export-collapsed\s*\{[^}]*display:\s*none/);

        // still fully self-contained
        expect(html).not.toMatch(/src="https?:/);
        expect(html).not.toMatch(/href="https?:/);
        expect(html).not.toContain('@import');
    });

    it('provides a print layout for paper', () => {
        const html = buildCasesHtml([makeCase({ notes: '備註' })]);

        // a @media print block exists
        expect(html).toContain('@media print');

        // isolate the @media print block content for targeted assertions
        const printIdx = html.indexOf('@media print');
        const printBlock = html.slice(printIdx);

        // interactive layer is hidden when printing
        expect(printBlock).toMatch(/\.export-ui[\s\S]*?display:\s*none/);
        // page breaks are controlled
        expect(printBlock).toContain('break-inside: avoid');
        // key markers preserve background color across browsers
        expect(printBlock).toContain('print-color-adjust');
        expect(printBlock).toContain('-webkit-print-color-adjust');
        // long tables repeat their header on each page
        expect(printBlock).toContain('table-header-group');

        // the static timeline list is forced visible for print even when the
        // interactive week view hid it inline (otherwise the timeline section
        // prints empty after switching to 週曆 view)
        expect(printBlock).toMatch(/\.timeline-list[\s\S]*?display:\s*block\s*!important/);

        // print styles do not break self-containment
        expect(html).not.toMatch(/src="https?:/);
        expect(html).not.toMatch(/href="https?:/);
        expect(html).not.toContain('@import');
    });
});
