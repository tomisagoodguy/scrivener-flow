/**
 * End-to-end (jsdom) verification of the exported HTML interactive layer.
 *
 * Drives the full handoff flow against a real generated document:
 *   add person -> assign event -> filter by person -> today highlight ->
 *   toggle completion -> download assigned version -> reopen restores state.
 *
 * This is the automated, reproducible form of task 4.3's manual checklist.
 *
 * @jest-environment jsdom
 */

import { buildCasesHtml } from '@/lib/cases/htmlExport';
import { buildInteractiveScript } from '@/lib/cases/exportInteractive';
import type { DemoCase } from '@/types';

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function ymd(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function makeCase(partial: Partial<DemoCase>): DemoCase {
    return {
        id: 'id-1',
        case_number: 'A-001',
        buyer_name: '王小明',
        seller_name: '李大華',
        ...partial,
    } as DemoCase;
}

/** Read a Blob as text (jsdom's Blob has no .text()). */
function blobText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsText(blob);
    });
}

/**
 * Load an HTML string into the current jsdom document, replacing the live
 * <html>. Uses DOMParser + importNode (rather than document.write) so repeated
 * loads within one test reliably reset the tree.
 */
function loadDocument(html: string): void {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

/** Execute the interactive script against the current document. */
function runInteractiveScript(): void {
    const wrapped = buildInteractiveScript();
    const body = wrapped.replace(/^<script>\n/, '').replace(/\n<\/script>$/, '');
    new Function(body)();
}

function itemByEventId(eventId: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(`.timeline-item[data-event-id="${eventId}"]`);
    if (!el) throw new Error(`timeline-item not found: ${eventId}`);
    return el;
}

const today = new Date();
const todayStr = ymd(today);
const plus3Str = ymd(new Date(today.getTime() + 3 * 86400000));

const CASES: DemoCase[] = [
    makeCase({
        id: 'ca',
        case_number: 'CASE-A',
        notes: 'A 案備註',
        milestones: [{ seal_date: todayStr }] as DemoCase['milestones'],
    }),
    makeCase({
        id: 'cb',
        case_number: 'CASE-B',
        notes: 'B 案備註',
        milestones: [{ seal_date: plus3Str }] as DemoCase['milestones'],
    }),
];

function tableRowByCaseId(caseId: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(`tr[data-case-id="${caseId}"]`);
    if (!el) throw new Error(`table row not found: ${caseId}`);
    return el;
}

function memoCardByCaseId(caseId: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(`.memo-card[data-case-id="${caseId}"]`);
    if (!el) throw new Error(`memo card not found: ${caseId}`);
    return el;
}

function weekEventByEventId(eventId: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(`.week-event[data-event-id="${eventId}"]`);
    if (!el) throw new Error(`week-event not found: ${eventId}`);
    return el;
}

function switchToWeek(): void {
    const btn = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.export-view-btn')
    ).find((b) => b.textContent === '週曆');
    if (!btn) throw new Error('week-agenda view button not found');
    btn.click();
}

function addPersonViaToolbar(name: string): void {
    const input = document.querySelector<HTMLInputElement>('.export-add-input')!;
    input.value = name;
    document.querySelector<HTMLButtonElement>('.export-add-btn')!.click();
}

describe('exported HTML interactive layer (full handoff flow)', () => {
    beforeEach(() => {
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
        loadDocument(buildCasesHtml(CASES));
        runInteractiveScript();
    });

    it('adds a person, assigns an event, and filters to that person', () => {
        // add person 王助理
        const input = document.querySelector<HTMLInputElement>('.export-add-input')!;
        const addBtn = document.querySelector<HTMLButtonElement>('.export-add-btn')!;
        input.value = '王助理';
        addBtn.click();

        // 王助理 appears in the filter bar
        const filterLabels = Array.from(document.querySelectorAll('.export-filter-btn')).map(
            (b) => b.textContent
        );
        expect(filterLabels).toContain('王助理');

        // assign CASE-A's seal event to 王助理
        const selA = itemByEventId('ca::seal_date').querySelector<HTMLSelectElement>(
            '.export-assignee'
        )!;
        expect(Array.from(selA.options).map((o) => o.value)).toContain('王助理');
        selA.value = '王助理';
        selA.dispatchEvent(new Event('change'));

        // filter to 王助理: CASE-A visible, CASE-B hidden
        const personBtn = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.export-filter-btn')
        ).find((b) => b.textContent === '王助理')!;
        personBtn.click();

        expect(itemByEventId('ca::seal_date').style.display).not.toBe('none');
        expect(itemByEventId('cb::seal_date').style.display).toBe('none');
    });

    it('highlights the day group matching the local open date', () => {
        const todayGroup = document.querySelector(`.timeline-day[data-day="${todayStr}"]`)!;
        const otherGroup = document.querySelector(`.timeline-day[data-day="${plus3Str}"]`)!;
        expect(todayGroup.classList.contains('timeline-day-today')).toBe(true);
        expect(otherGroup.classList.contains('timeline-day-today')).toBe(false);
    });

    it('toggles completion and caches it in localStorage', () => {
        const item = itemByEventId('ca::seal_date');
        const cb = item.querySelector<HTMLInputElement>('.export-done input[type="checkbox"]')!;
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));

        expect(item.classList.contains('export-item-done')).toBe(true);
        const cached = JSON.parse(localStorage.getItem(`sf-cases-export-done::${location.pathname}`)!);
        expect(cached['ca::seal_date']).toBe(true);
    });

    it('downloads an assigned version whose embedded state carries people and assignments', async () => {
        // add + assign
        const input = document.querySelector<HTMLInputElement>('.export-add-input')!;
        input.value = '王助理';
        document.querySelector<HTMLButtonElement>('.export-add-btn')!.click();
        const selA = itemByEventId('ca::seal_date').querySelector<HTMLSelectElement>(
            '.export-assignee'
        )!;
        selA.value = '王助理';
        selA.dispatchEvent(new Event('change'));

        // capture the downloaded blob
        let captured: Blob | null = null;
        const origCreate = URL.createObjectURL;
        URL.createObjectURL = (blob: Blob) => {
            captured = blob;
            return 'blob:mock';
        };
        // jsdom has no revokeObjectURL; the script revokes via setTimeout(0),
        // so leave a noop in place (don't restore to undefined).
        URL.revokeObjectURL = () => {};
        try {
            document.querySelector<HTMLButtonElement>('.export-download')!.click();
        } finally {
            URL.createObjectURL = origCreate;
        }

        expect(captured).not.toBeNull();
        const downloaded = await blobText(captured as unknown as Blob);

        // the embedded state node carries the people list and assignment
        const match = downloaded.match(
            /<script type="application\/json" id="export-state">([\s\S]*?)<\/script>/
        );
        expect(match).not.toBeNull();
        const state = JSON.parse(match![1]);
        expect(state.people).toContain('王助理');
        // Assignment is now keyed by case id (not event id).
        expect(state.assignments['ca']).toBe('王助理');

        // reopen the downloaded file in a fresh document
        loadDocument(downloaded);

        // before re-running the script: injected control elements are stripped
        // (class names persist in the static <style>, but no live nodes remain)
        expect(document.querySelectorAll('.export-toolbar').length).toBe(0);
        expect(document.querySelectorAll('.export-item-controls').length).toBe(0);
        expect(document.querySelectorAll('select.export-assignee').length).toBe(0);

        // re-running the script restores people + assignments from embedded state
        runInteractiveScript();
        const reopenedLabels = Array.from(document.querySelectorAll('.export-filter-btn')).map(
            (b) => b.textContent
        );
        expect(reopenedLabels).toContain('王助理');
        const reopenedSel = itemByEventId('ca::seal_date').querySelector<HTMLSelectElement>(
            '.export-assignee'
        )!;
        expect(reopenedSel.value).toBe('王助理');
    });
});

describe('exported HTML interactive layer (case-level assignment sync)', () => {
    beforeEach(() => {
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
        loadDocument(buildCasesHtml(CASES));
        runInteractiveScript();
    });

    function addPerson(name: string): void {
        const input = document.querySelector<HTMLInputElement>('.export-add-input')!;
        input.value = name;
        document.querySelector<HTMLButtonElement>('.export-add-btn')!.click();
    }

    function rowSelect(caseId: string): HTMLSelectElement {
        const sel = tableRowByCaseId(caseId).querySelector<HTMLSelectElement>('.export-assignee');
        if (!sel) throw new Error(`row select not found: ${caseId}`);
        return sel;
    }

    it('places the toolbar at the very top, above the table section', () => {
        const toolbar = document.querySelector('.export-toolbar')!;
        const firstSection = document.querySelector('.section')!;
        // toolbar precedes the first (table) section in document order
        expect(
            toolbar.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });

    it('deletes a person, unassigning their cases across all sections', () => {
        addPerson('王助理');
        const sel = rowSelect('ca');
        sel.value = '王助理';
        sel.dispatchEvent(new Event('change'));
        expect(tableRowByCaseId('ca').querySelector('.export-assignee-badge')!.textContent).toBe(
            '承辦：王助理'
        );

        // click the × delete control next to 王助理 in the filter bar
        const chip = Array.from(document.querySelectorAll<HTMLElement>('.export-filter-chip')).find(
            (c) => c.querySelector('.export-filter-btn')?.textContent === '王助理'
        )!;
        chip.querySelector<HTMLButtonElement>('.export-filter-del')!.click();

        // person gone from the filter bar and from every selector's options
        const labels = Array.from(document.querySelectorAll('.export-filter-btn')).map(
            (b) => b.textContent
        );
        expect(labels).not.toContain('王助理');
        expect(Array.from(rowSelect('ca').options).map((o) => o.value)).not.toContain('王助理');

        // case ca is now unassigned: selectors empty, badges hidden
        expect(rowSelect('ca').value).toBe('');
        const rowBadge = tableRowByCaseId('ca').querySelector<HTMLElement>('.export-assignee-badge')!;
        const memoBadge = memoCardByCaseId('ca').querySelector<HTMLElement>('.export-assignee-badge')!;
        expect(rowBadge.style.display).toBe('none');
        expect(memoBadge.style.display).toBe('none');
    });

    it('assigning from the table row mirrors the timeline and shows badges on table + memo', () => {
        addPerson('王助理');

        // assign whole case CASE-A from its table row selector
        const sel = rowSelect('ca');
        expect(Array.from(sel.options).map((o) => o.value)).toContain('王助理');
        sel.value = '王助理';
        sel.dispatchEvent(new Event('change'));

        // every timeline event selector for case A reflects the assignment
        const timelineSel = itemByEventId('ca::seal_date').querySelector<HTMLSelectElement>(
            '.export-assignee'
        )!;
        expect(timelineSel.value).toBe('王助理');

        // table row badge and memo card badge both show 承辦：王助理
        const rowBadge = tableRowByCaseId('ca').querySelector('.export-assignee-badge')!;
        const memoBadge = memoCardByCaseId('ca').querySelector('.export-assignee-badge')!;
        expect(rowBadge.textContent).toBe('承辦：王助理');
        expect(memoBadge.textContent).toBe('承辦：王助理');
    });

    it('changing the assignee from the timeline updates every section at once', () => {
        addPerson('王助理');
        addPerson('李助理');

        const timelineSel = itemByEventId('ca::seal_date').querySelector<HTMLSelectElement>(
            '.export-assignee'
        )!;
        timelineSel.value = '王助理';
        timelineSel.dispatchEvent(new Event('change'));
        expect(rowSelect('ca').value).toBe('王助理');

        // change to 李助理 from the timeline; table + memo + timeline all follow
        timelineSel.value = '李助理';
        timelineSel.dispatchEvent(new Event('change'));

        expect(rowSelect('ca').value).toBe('李助理');
        expect(tableRowByCaseId('ca').querySelector('.export-assignee-badge')!.textContent).toBe(
            '承辦：李助理'
        );
        expect(memoCardByCaseId('ca').querySelector('.export-assignee-badge')!.textContent).toBe(
            '承辦：李助理'
        );
    });

    it('unassigned cases show no badge', () => {
        const rowBadge = tableRowByCaseId('ca').querySelector<HTMLElement>('.export-assignee-badge');
        const memoBadge = memoCardByCaseId('ca').querySelector<HTMLElement>('.export-assignee-badge');
        // badge nodes may exist but are hidden and carry no text when unassigned
        expect(rowBadge ? rowBadge.style.display : 'none').toBe('none');
        expect(memoBadge ? memoBadge.style.display : 'none').toBe('none');
    });

    it('filtering by a person hides unassigned cases across all three sections', () => {
        addPerson('王助理');
        addPerson('李助理');

        // CASE-A -> 王助理, CASE-B left unassigned
        const selA = rowSelect('ca');
        selA.value = '王助理';
        selA.dispatchEvent(new Event('change'));

        const personBtn = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.export-filter-btn')
        ).find((b) => b.textContent === '王助理')!;
        personBtn.click();

        // CASE-A visible everywhere
        expect(itemByEventId('ca::seal_date').style.display).not.toBe('none');
        expect(tableRowByCaseId('ca').style.display).not.toBe('none');
        expect(memoCardByCaseId('ca').style.display).not.toBe('none');

        // CASE-B (unassigned) hidden everywhere
        expect(itemByEventId('cb::seal_date').style.display).toBe('none');
        expect(tableRowByCaseId('cb').style.display).toBe('none');
        expect(memoCardByCaseId('cb').style.display).toBe('none');

        // "全部" restores everything
        const allBtn = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.export-filter-btn')
        ).find((b) => b.textContent === '全部')!;
        allBtn.click();
        expect(tableRowByCaseId('cb').style.display).not.toBe('none');
        expect(memoCardByCaseId('cb').style.display).not.toBe('none');
    });

    it('hides a whole day group when filtering leaves it with no visible events', () => {
        addPerson('王助理');

        // CASE-A (today) → 王助理; CASE-B (+3 days) left unassigned. The two events
        // fall on different days, so each lives in its own .timeline-day-group.
        const selA = rowSelect('ca');
        selA.value = '王助理';
        selA.dispatchEvent(new Event('change'));

        const groupOf = (eventId: string): HTMLElement => {
            const group = itemByEventId(eventId).closest('.timeline-day-group') as HTMLElement;
            if (!group) throw new Error(`day group not found for ${eventId}`);
            return group;
        };

        const personBtn = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.export-filter-btn')
        ).find((b) => b.textContent === '王助理')!;
        personBtn.click();

        // CASE-A's day group stays visible; CASE-B's day group (no visible events)
        // is hidden as a whole — not just its header — so no empty grid cell remains.
        expect(groupOf('ca::seal_date').style.display).not.toBe('none');
        expect(groupOf('cb::seal_date').style.display).toBe('none');

        // switching back to 全部 restores the hidden day group
        const allBtn = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.export-filter-btn')
        ).find((b) => b.textContent === '全部')!;
        allBtn.click();
        expect(groupOf('cb::seal_date').style.display).not.toBe('none');
    });

    it('downloads a case-level assigned version and restores all sections on reopen', async () => {
        addPerson('王助理');
        const sel = rowSelect('ca');
        sel.value = '王助理';
        sel.dispatchEvent(new Event('change'));

        let captured: Blob | null = null;
        const origCreate = URL.createObjectURL;
        URL.createObjectURL = (blob: Blob) => {
            captured = blob;
            return 'blob:mock';
        };
        URL.revokeObjectURL = () => {};
        try {
            document.querySelector<HTMLButtonElement>('.export-download')!.click();
        } finally {
            URL.createObjectURL = origCreate;
        }

        const downloaded = await blobText(captured as unknown as Blob);
        const match = downloaded.match(
            /<script type="application\/json" id="export-state">([\s\S]*?)<\/script>/
        );
        const state = JSON.parse(match![1]);
        // assignments keyed by case id, not event id
        expect(state.assignments).toEqual({ ca: '王助理' });

        // reopen: injected controls stripped, then re-run restores all sections
        loadDocument(downloaded);
        expect(document.querySelectorAll('.export-assignee-badge').length).toBe(0);
        runInteractiveScript();

        expect(rowSelect('ca').value).toBe('王助理');
        expect(
            itemByEventId('ca::seal_date').querySelector<HTMLSelectElement>('.export-assignee')!.value
        ).toBe('王助理');
        expect(tableRowByCaseId('ca').querySelector('.export-assignee-badge')!.textContent).toBe(
            '承辦：王助理'
        );
        expect(memoCardByCaseId('ca').querySelector('.export-assignee-badge')!.textContent).toBe(
            '承辦：王助理'
        );
    });
});

describe('exported HTML interactive layer (timeline calendar grid view)', () => {
    beforeEach(() => {
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
        loadDocument(buildCasesHtml(CASES));
        runInteractiveScript();
    });

    // Default list view + view switcher present; calendar built lazily on switch.
    it('defaults to the list view and offers a list/week switcher', () => {
        const list = document.querySelector<HTMLElement>('.timeline-list')!;
        expect(list).not.toBeNull();
        expect(list.style.display).not.toBe('none');

        const labels = Array.from(document.querySelectorAll('.export-view-btn')).map(
            (b) => b.textContent
        );
        expect(labels).toContain('條列');
        expect(labels).toContain('週曆');

        // the week container is injected but hidden until selected
        const week = document.querySelector<HTMLElement>('.week-agenda')!;
        expect(week).not.toBeNull();
        expect(week.style.display).toBe('none');
    });

    // Task 2.1(a)(b): each week is a 7-column .week-grid whose direct children are
    // exactly 7 .week-cell (Mon..Sun); each cell carries data-day; only today's
    // cell is marked .week-cell-today.
    it('switching to week renders a 7-column grid of week-cells with data-day', () => {
        switchToWeek();

        const week = document.querySelector<HTMLElement>('.week-agenda')!;
        expect(week.style.display).not.toBe('none');
        expect(document.querySelector<HTMLElement>('.timeline-list')!.style.display).toBe('none');

        // at least one week grid; each grid has exactly 7 direct .week-cell children
        const grids = Array.from(document.querySelectorAll<HTMLElement>('.week-grid'));
        expect(grids.length).toBeGreaterThan(0);
        for (const grid of grids) {
            const directCells = Array.from(grid.children).filter((c) =>
                c.classList.contains('week-cell')
            );
            expect(directCells.length).toBe(7);
            expect(grid.children.length).toBe(7);
        }

        // every cell carries a data-day; exactly the today cell is highlighted
        const cells = Array.from(document.querySelectorAll<HTMLElement>('.week-cell'));
        for (const cell of cells) {
            expect(cell.getAttribute('data-day')).toBeTruthy();
        }
        const todayCell = document.querySelector<HTMLElement>(`.week-cell[data-day="${todayStr}"]`)!;
        expect(todayCell).not.toBeNull();
        expect(todayCell.classList.contains('week-cell-today')).toBe(true);
        const otherCell = document.querySelector<HTMLElement>(`.week-cell[data-day="${plus3Str}"]`)!;
        expect(otherCell.classList.contains('week-cell-today')).toBe(false);
    });

    // Task 2.1(c)(d): event chips keep data-case-id/data-event-id and sit inside
    // their own date's cell; days without events are empty cells (not full rows).
    it('places each event chip inside the cell for its own date and leaves empty days as empty cells', () => {
        switchToWeek();

        const ev = weekEventByEventId('ca::seal_date');
        expect(ev.getAttribute('data-case-id')).toBe('ca');
        expect(ev.getAttribute('data-event-id')).toBe('ca::seal_date');
        // chip shows the buyer/seller names (not the hard-to-read case number),
        // while case identity is still carried via data-case-id for sync
        expect(ev.querySelector('.timeline-parties')!.textContent).toBe('王小明 / 李大華');
        expect(ev.querySelector('.timeline-case')).toBeNull();
        // chip lives inside the cell whose data-day matches its event date (today)
        const hostCell = ev.closest('.week-cell') as HTMLElement;
        expect(hostCell).not.toBeNull();
        expect(hostCell.getAttribute('data-day')).toBe(todayStr);

        // a day known to have no events renders as a cell with no .week-event
        const plus1Str = ymd(new Date(today.getTime() + 1 * 86400000));
        const emptyCell = document.querySelector<HTMLElement>(`.week-cell[data-day="${plus1Str}"]`)!;
        expect(emptyCell).not.toBeNull();
        expect(emptyCell.querySelectorAll('.week-event').length).toBe(0);
    });

    // Week calendar reuses case assignment filtering (chip-level visibility).
    it('filters calendar event chips by assigned person and restores on 全部', () => {
        addPersonViaToolbar('王助理');
        const sel = itemByEventId('ca::seal_date').querySelector<HTMLSelectElement>(
            '.export-assignee'
        )!;
        sel.value = '王助理';
        sel.dispatchEvent(new Event('change'));

        switchToWeek();

        const personBtn = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.export-filter-btn')
        ).find((b) => b.textContent === '王助理')!;
        personBtn.click();

        // CASE-A assigned → visible; CASE-B unassigned → hidden
        expect(weekEventByEventId('ca::seal_date').style.display).not.toBe('none');
        expect(weekEventByEventId('cb::seal_date').style.display).toBe('none');

        const allBtn = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.export-filter-btn')
        ).find((b) => b.textContent === '全部')!;
        allBtn.click();
        expect(weekEventByEventId('cb::seal_date').style.display).not.toBe('none');
    });

    // Completion in the calendar mirrors the list (shared eventId + localStorage).
    it('completing an event from the calendar marks the same event in the list', () => {
        switchToWeek();

        const wcb = weekEventByEventId('ca::seal_date').querySelector<HTMLInputElement>(
            'input[type="checkbox"]'
        )!;
        wcb.checked = true;
        wcb.dispatchEvent(new Event('change'));

        // the list item for the same eventId is marked complete and its checkbox synced
        const listItem = itemByEventId('ca::seal_date');
        expect(listItem.classList.contains('export-item-done')).toBe(true);
        const listCb = listItem.querySelector<HTMLInputElement>(
            '.export-done input[type="checkbox"]'
        )!;
        expect(listCb.checked).toBe(true);

        // localStorage cache matches the list-view behavior
        const cached = JSON.parse(localStorage.getItem(`sf-cases-export-done::${location.pathname}`)!);
        expect(cached['ca::seal_date']).toBe(true);

        // the week event itself carries the completion styling
        expect(weekEventByEventId('ca::seal_date').classList.contains('export-item-done')).toBe(true);
    });
});

// With JavaScript disabled (script never runs) the timeline is the static list.
describe('exported HTML timeline without the interactive script (JS disabled)', () => {
    beforeEach(() => {
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
        loadDocument(buildCasesHtml(CASES));
        // deliberately do NOT run the interactive script
    });

    it('renders only the static list with no switcher or week-agenda container', () => {
        expect(document.querySelector('.timeline-list')).not.toBeNull();
        expect(document.querySelectorAll('.timeline-item').length).toBeGreaterThan(0);

        // none of the runtime-injected nodes exist
        expect(document.querySelectorAll('.export-ui').length).toBe(0);
        expect(document.querySelectorAll('.export-view-btn').length).toBe(0);
        expect(document.querySelectorAll('.week-agenda').length).toBe(0);
        expect(document.querySelectorAll('.week-grid').length).toBe(0);
        expect(document.querySelectorAll('.week-cell').length).toBe(0);
    });
});
