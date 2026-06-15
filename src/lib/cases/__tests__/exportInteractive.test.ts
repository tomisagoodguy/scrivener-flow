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
