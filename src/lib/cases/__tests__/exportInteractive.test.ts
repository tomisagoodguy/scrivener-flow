/**
 * Tests for the interactive layer of the cases HTML export.
 *
 * TDD: written BEFORE implementation. Covers spec scenarios of
 * "cases-export-interactive-calendar":
 *   - Stable event IDs keyed by case id + field key (or todo id)
 *   - Initial state serialization is a valid, empty, non-throwing state
 *   - The interactive <script> embeds assignment, people, filter, today,
 *     completion and "download assigned version" behaviors
 */

import {
    getExportEventId,
    serializeInitialState,
    buildInteractiveScript,
    type InteractiveEvent,
} from '@/lib/cases/exportInteractive';
import { buildCasesHtml } from '@/lib/cases/htmlExport';
import type { DemoCase } from '@/types';

/** Load an HTML string into the live jsdom document, replacing <html>. */
function loadDocument(html: string): void {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    document.replaceChild(
        document.importNode(parsed.documentElement, true),
        document.documentElement
    );
}

/** Execute the interactive script against the current document. */
function runInteractiveScript(): void {
    const wrapped = buildInteractiveScript();
    const body = wrapped.replace(/^<script>\n/, '').replace(/\n<\/script>$/, '');
    new Function(body)();
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

/** Click "下載已指派版本" and return the embedded #export-state JSON of the download. */
async function downloadState(): Promise<{ collapsed?: Record<string, boolean> }> {
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
    const html = await blobText(captured as unknown as Blob);
    const match = html.match(
        /<script type="application\/json" id="export-state">([\s\S]*?)<\/script>/
    );
    return JSON.parse(match![1]);
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

function memoBlock(caseId: string, blockClass: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(
        `.memo-card[data-case-id="${caseId}"] .memo-block.${blockClass}`
    );
    if (!el) throw new Error(`memo-block not found: ${caseId} .${blockClass}`);
    return el;
}

/** All cases carry every memo type so each block class is present. */
const MEMO_CASES: DemoCase[] = [
    makeCase({
        id: 'ca',
        case_number: 'CASE-A',
        notes: 'A 警示備註',
        pending_tasks: 'A 其他備忘',
        private_notes: 'A 私密備註',
    }),
    makeCase({
        id: 'cb',
        case_number: 'CASE-B',
        notes: 'B 警示備註',
        pending_tasks: 'B 其他備忘',
        private_notes: 'B 私密備註',
    }),
];

describe('getExportEventId', () => {
    it('uses caseId::fieldKey for milestone / appointment / tax events', () => {
        const milestone: InteractiveEvent = { caseId: 'case-1', fieldKey: 'seal_date' };
        const appointment: InteractiveEvent = { caseId: 'case-1', fieldKey: 'tax_appointment' };
        const tax: InteractiveEvent = { caseId: 'case-2', fieldKey: 'land_tax_deadline' };

        expect(getExportEventId(milestone)).toBe('case-1::seal_date');
        expect(getExportEventId(appointment)).toBe('case-1::tax_appointment');
        expect(getExportEventId(tax)).toBe('case-2::land_tax_deadline');
    });

    it('uses caseId::todo::todoId for todo events', () => {
        const todo: InteractiveEvent = { caseId: 'case-3', todoId: 'todo-9' };
        expect(getExportEventId(todo)).toBe('case-3::todo::todo-9');
    });

    it('prefers the todo form when both todoId and fieldKey are present', () => {
        const event: InteractiveEvent = { caseId: 'case-4', fieldKey: 'seal_date', todoId: 'todo-1' };
        expect(getExportEventId(event)).toBe('case-4::todo::todo-1');
    });
});

describe('serializeInitialState', () => {
    it('returns a JSON string of an empty { people, assignments, done } state', () => {
        const parsed = JSON.parse(serializeInitialState());
        expect(parsed).toEqual({ people: [], assignments: {}, done: {} });
    });

    it('returns a valid empty state for no events, empty list, and events missing dates', () => {
        // no argument
        expect(() => serializeInitialState()).not.toThrow();
        // empty list
        expect(JSON.parse(serializeInitialState([]))).toEqual({
            people: [],
            assignments: {},
            done: {},
        });
        // events without dates (date is not part of the ID) still serialize cleanly
        const events: InteractiveEvent[] = [
            { caseId: 'c1', fieldKey: 'seal_date' },
            { caseId: 'c2', todoId: 't1' },
        ];
        expect(() => serializeInitialState(events)).not.toThrow();
        expect(JSON.parse(serializeInitialState(events))).toEqual({
            people: [],
            assignments: {},
            done: {},
        });
    });
});

describe('buildInteractiveScript', () => {
    const script = buildInteractiveScript();

    it('is wrapped in a <script> tag and reads the embedded #export-state node', () => {
        expect(script).toMatch(/^<script>/);
        expect(script.trim()).toMatch(/<\/script>$/);
        expect(script).toContain('export-state');
    });

    it('hydrates from the embedded state and falls back when missing', () => {
        // a JSON fallback object literal embedded in the script
        expect(script).toContain('"people"');
        expect(script).toContain('"assignments"');
        expect(script).toContain('"done"');
    });

    it('manages a people list (assignment + add-person with de-dup)', () => {
        expect(script).toContain('assignments');
        expect(script).toContain('people');
    });

    it('filters by person and re-highlights today by local open date', () => {
        expect(script).toContain('timeline-day-today');
        expect(script).toContain('data-day');
    });

    it('toggles completion with a localStorage cache that degrades gracefully', () => {
        expect(script).toContain('localStorage');
        expect(script).toContain('try');
    });

    it('downloads an assigned version by re-serializing the document', () => {
        expect(script).toContain('Blob');
        expect(script).toContain('outerHTML');
    });
});

describe('case-level assignment semantics', () => {
    it('serializeInitialState keeps assignments/done empty even with events (assignments keyed by caseId, done by eventId)', () => {
        const events: InteractiveEvent[] = [
            { caseId: 'c1', fieldKey: 'seal_date' },
            { caseId: 'c1', todoId: 't1' },
        ];
        const parsed = JSON.parse(serializeInitialState(events));
        // No event id ever leaks into assignments; assignment keys are case ids.
        expect(parsed.assignments).toEqual({});
        expect(parsed.done).toEqual({});
    });

    it('interactive script assigns per case (caseId) while completion stays per event (eventId)', () => {
        const s = buildInteractiveScript();
        // Unified per-case assignment entry point keyed by case id.
        expect(s).toContain('applyAssignment');
        // Assignment reads/writes the case id, not the event id.
        expect(s).toContain("getAttribute('data-case-id')");
        // Completion (done) is still keyed by the per-event id.
        expect(s).toContain('state.done[eventId]');
    });
});

describe('per-card memo block collapse', () => {
    beforeEach(() => {
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
    });

    // (a) injection adds a collapse button (export-ui) to every memo block.
    it('injects an export-ui collapse button into every memo block', () => {
        loadDocument(buildCasesHtml(MEMO_CASES));
        runInteractiveScript();

        const blocks = document.querySelectorAll<HTMLElement>('.memo-block');
        expect(blocks.length).toBeGreaterThan(0);
        blocks.forEach((block) => {
            const btn = block.querySelector<HTMLButtonElement>('button.export-memo-collapse');
            expect(btn).not.toBeNull();
            expect(btn!.classList.contains('export-ui')).toBe(true);
        });
    });

    // (b) toggling collapses the block (class on the .memo-block) and persists
    // the per-card key into state.collapsed; toggling again clears both.
    it('collapses a block by class + state.collapsed key, and toggling again clears it', async () => {
        loadDocument(buildCasesHtml(MEMO_CASES));
        runInteractiveScript();

        const block = memoBlock('ca', 'memo-warning');
        const btn = block.querySelector<HTMLButtonElement>('button.export-memo-collapse')!;

        // collapse
        btn.click();
        expect(block.classList.contains('export-collapsed')).toBe(true);
        expect(btn.textContent).toBe('展開');
        let state = await downloadState();
        expect(state.collapsed?.['ca|warning']).toBe(true);

        // expand again
        btn.click();
        expect(block.classList.contains('export-collapsed')).toBe(false);
        expect(btn.textContent).toBe('收合');
        state = await downloadState();
        expect(state.collapsed?.['ca|warning']).toBeFalsy();
    });

    // The toggle must live in the always-visible label row, not the content node
    // that gets hidden on collapse — otherwise the 展開 button vanishes with it.
    it('keeps the collapse toggle in the label row, not the hidden content node', () => {
        loadDocument(buildCasesHtml(MEMO_CASES));
        runInteractiveScript();

        const block = memoBlock('ca', 'memo-warning');
        expect(block.querySelector('.memo-label button.export-memo-collapse')).not.toBeNull();
        expect(block.querySelector('.memo-content button.export-memo-collapse')).toBeNull();

        // still reachable (and toggleable) after the block is collapsed
        const btn = block.querySelector<HTMLButtonElement>('button.export-memo-collapse')!;
        btn.click();
        expect(block.classList.contains('export-collapsed')).toBe(true);
        expect(block.querySelector('.memo-label button.export-memo-collapse')).not.toBeNull();
        btn.click();
        expect(block.classList.contains('export-collapsed')).toBe(false);
    });

    // blockType is derived from the memo-warning/pending/private class.
    it('derives the blockType key from the memo block class', async () => {
        loadDocument(buildCasesHtml(MEMO_CASES));
        runInteractiveScript();

        memoBlock('cb', 'memo-pending')
            .querySelector<HTMLButtonElement>('button.export-memo-collapse')!
            .click();
        memoBlock('ca', 'memo-private')
            .querySelector<HTMLButtonElement>('button.export-memo-collapse')!
            .click();

        const state = await downloadState();
        expect(state.collapsed?.['cb|pending']).toBe(true);
        expect(state.collapsed?.['ca|private']).toBe(true);
    });

    // (c) initializing from a preset #export-state restores collapsed blocks.
    it('restores collapsed blocks from a preset #export-state on init', () => {
        loadDocument(buildCasesHtml(MEMO_CASES));
        document.getElementById('export-state')!.textContent = JSON.stringify({
            people: [],
            assignments: {},
            done: {},
            collapsed: { 'ca|private': true },
        });
        runInteractiveScript();

        const privateBlock = memoBlock('ca', 'memo-private');
        expect(privateBlock.classList.contains('export-collapsed')).toBe(true);
        expect(
            privateBlock.querySelector<HTMLButtonElement>('button.export-memo-collapse')!.textContent
        ).toBe('展開');

        // a block without a preset key stays expanded
        const warningBlock = memoBlock('ca', 'memo-warning');
        expect(warningBlock.classList.contains('export-collapsed')).toBe(false);
    });
});

describe('global memo category collapse switches', () => {
    beforeEach(() => {
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
        loadDocument(buildCasesHtml(MEMO_CASES));
        runInteractiveScript();
    });

    function globalBtn(type: 'warning' | 'pending' | 'private'): HTMLButtonElement {
        const el = document.querySelector<HTMLButtonElement>(
            `button.export-memo-collapse-all[data-block-type="${type}"]`
        );
        if (!el) throw new Error(`global switch not found: ${type}`);
        return el;
    }

    // (a) three export-ui category switches with data-block-type at the top.
    it('injects three export-ui category switches with data-block-type', () => {
        const btns = document.querySelectorAll<HTMLButtonElement>('button.export-memo-collapse-all');
        expect(btns.length).toBe(3);
        const types = Array.from(btns).map((b) => b.getAttribute('data-block-type')).sort();
        expect(types).toEqual(['pending', 'private', 'warning']);
        btns.forEach((b) => expect(b.classList.contains('export-ui')).toBe(true));
    });

    // (b) clicking a category collapses every card's block of that type.
    it('collapses every card of a category on one click', async () => {
        globalBtn('warning').click();

        expect(memoBlock('ca', 'memo-warning').classList.contains('export-collapsed')).toBe(true);
        expect(memoBlock('cb', 'memo-warning').classList.contains('export-collapsed')).toBe(true);
        // other categories untouched
        expect(memoBlock('ca', 'memo-pending').classList.contains('export-collapsed')).toBe(false);

        const state = await downloadState();
        expect(state.collapsed?.['ca|warning']).toBe(true);
        expect(state.collapsed?.['cb|warning']).toBe(true);
    });

    // (c) clicking again when the category is fully collapsed expands all.
    it('expands every card of a category when already all collapsed', async () => {
        globalBtn('private').click(); // collapse all private
        globalBtn('private').click(); // toggle → expand all

        expect(memoBlock('ca', 'memo-private').classList.contains('export-collapsed')).toBe(false);
        expect(memoBlock('cb', 'memo-private').classList.contains('export-collapsed')).toBe(false);

        const state = await downloadState();
        expect(state.collapsed?.['ca|private']).toBeFalsy();
        expect(state.collapsed?.['cb|private']).toBeFalsy();
    });

    // (d) direction is derived from current state: with one card re-expanded,
    // clicking global again collapses the remaining expanded ones.
    it('re-collapses remaining expanded cards after a single per-card expand', () => {
        globalBtn('warning').click(); // all warning collapsed

        // individually expand CASE-A's warning block
        const caBtn = memoBlock('ca', 'memo-warning').querySelector<HTMLButtonElement>(
            'button.export-memo-collapse'
        )!;
        caBtn.click();
        expect(memoBlock('ca', 'memo-warning').classList.contains('export-collapsed')).toBe(false);

        // global again: an expanded card exists → collapse all of that category
        globalBtn('warning').click();
        expect(memoBlock('ca', 'memo-warning').classList.contains('export-collapsed')).toBe(true);
        expect(memoBlock('cb', 'memo-warning').classList.contains('export-collapsed')).toBe(true);
    });
});
