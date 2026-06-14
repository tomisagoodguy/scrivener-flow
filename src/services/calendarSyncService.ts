/**
 * Google 行事曆同步服務（伺服器端）。
 *
 * 將案件四類日期（里程碑、約定時間、財務稅限、待辦）單向同步到使用者專用的
 * 「案件」子行事曆。包含：
 *   - provisionCaseCalendar：建立 / 沿用 / 重建專用子行事曆
 *   - decideSyncAction + syncField：通用的單欄位 create / update / skip / delete
 *   - syncCase / syncTodo：四來源的彙整同步
 *
 * ⚠️ 僅可於伺服器端執行（使用 server supabase client + getAccessToken）。
 * 觸發點（caseService / todoService，client 端）須透過 src/app/actions/calendarSync.ts
 * 的 Server Action 呼叫，勿直接 import 本檔，以免把 next/headers 帶進 client bundle。
 *
 * 設計決策見 openspec/changes/google-calendar-milestone-sync/design.md。
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAccessToken } from '@/app/actions/googleDrive';
import {
    CALENDAR_TIME_ZONE,
    buildEventPayload,
    buildEventTitle,
    insertCalendar,
    getCalendar,
    getEvent,
    listEvents,
    insertEvent,
    patchEvent,
    deleteEvent,
} from '@/lib/google/calendar';
import { CASE_INACTIVE_STATUSES } from '@/lib/constants/caseConstants';

const MAPPINGS_TABLE = 'calendar_event_mappings';

/** scope 不足 / 403：呼叫端應提示使用者重新登入授權行事曆。 */
export class CalendarAuthError extends Error {
    constructor(message = '需重新登入以授權 Google 行事曆') {
        super(message);
        this.name = 'CalendarAuthError';
    }
}

export type SyncAction = 'create' | 'update' | 'skip' | 'delete' | 'noop';

export interface SyncStats {
    created: number;
    updated: number;
    skipped: number;
    recreated: number;
    deleted: number;
    noop: number;
}

export interface CalendarSyncResult {
    status: 'ok' | 'needs_reauth' | 'error';
    error?: string;
    /** 回填時掃描的案件總數（含已結案） */
    casesProcessed?: number;
    /** 回填時掃描的承辦中案件數 */
    activeCasesProcessed?: number;
    todosProcessed?: number;
    /** 本次實際在 Google 建立 / 更新 / 重建的事件數 */
    eventsWritten?: number;
    /** 回填完成後 Google「案件」子行事曆上的事件總數 */
    googleEventCount?: number;
    stats?: SyncStats;
    /** 回填過程中第一個非授權類錯誤 */
    firstError?: string;
}

export interface SyncContext {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any, any, any>;
    userId: string;
    token: string;
    calendarId: string;
    stats?: SyncStats;
}

function emptyStats(): SyncStats {
    return { created: 0, updated: 0, skipped: 0, recreated: 0, deleted: 0, noop: 0 };
}

function bumpStat(stats: SyncStats | undefined, key: keyof SyncStats): void {
    if (stats) stats[key]++;
}

export interface FieldSpec {
    sourceTable: 'milestones' | 'financials' | 'todos';
    sourceId: string;
    sourceField: string;
    value: string | null;
    allDay: boolean;
    title: string;
}

interface MappingRow {
    id: string;
    google_event_id: string;
    google_calendar_id: string;
    synced_value: string | null;
}

/**
 * 依來源值與既有 mapping 決定同步動作（決策「同步動作的決策邏輯」）。
 */
export function decideSyncAction(
    value: string | null | undefined,
    mapping: { synced_value: string | null } | null
): SyncAction {
    const hasValue = value !== null && value !== undefined && value !== '';
    if (!hasValue) {
        return mapping ? 'delete' : 'noop';
    }
    if (!mapping) return 'create';
    return mapping.synced_value === value ? 'skip' : 'update';
}

function isAuthFailure(status: number): boolean {
    return status === 401 || status === 403;
}

/**
 * 建立 / 沿用 / 重建使用者專用「案件」子行事曆，回傳 calendarId。
 */
export async function provisionCaseCalendar(
    supabase: SyncContext['supabase'],
    userId: string,
    token: string
): Promise<string> {
    const { data: settings } = await supabase
        .from('user_settings')
        .select('case_calendar_id')
        .eq('user_id', userId)
        .maybeSingle();

    const storedId = settings?.case_calendar_id as string | null | undefined;

    if (storedId) {
        const check = await getCalendar(token, storedId);
        if (check.ok) return storedId;
        if (isAuthFailure(check.status)) throw new CalendarAuthError();
        // 404（或其他）→ 視為已失效，往下重建
    }

    const created = await insertCalendar(token);
    if (!created.ok || !created.data?.id) {
        if (isAuthFailure(created.status)) throw new CalendarAuthError();
        throw new Error(`建立子行事曆失敗：${created.error ?? created.status}`);
    }
    const newId = created.data.id;

    await supabase
        .from('user_settings')
        .upsert({ user_id: userId, case_calendar_id: newId }, { onConflict: 'user_id' });

    return newId;
}

async function readMapping(ctx: SyncContext, spec: FieldSpec): Promise<MappingRow | null> {
    const { data, error } = await ctx.supabase
        .from(MAPPINGS_TABLE)
        .select('id, google_event_id, google_calendar_id, synced_value')
        .eq('source_table', spec.sourceTable)
        .eq('source_id', spec.sourceId)
        .eq('source_field', spec.sourceField)
        .maybeSingle();
    if (error) {
        throw new Error(`讀取行事曆對應失敗：${error.message}（請確認 DB migration 已套用）`);
    }
    return (data as MappingRow | null) ?? null;
}

async function persistMappingUpsert(ctx: SyncContext, row: Record<string, unknown>): Promise<void> {
    const { error } = await ctx.supabase.from(MAPPINGS_TABLE).upsert(row, {
        onConflict: 'source_table,source_id,source_field',
    });
    if (error) throw new Error(`寫入行事曆對應失敗：${error.message}`);
}

async function recreateMappedEvent(ctx: SyncContext, spec: FieldSpec, map: MappingRow): Promise<void> {
    const payload = buildEventPayload({ title: spec.title, value: spec.value as string, allDay: spec.allDay });
    const res = await insertEvent(ctx.token, ctx.calendarId, payload);
    if (!res.ok || !res.data?.id) {
        if (isAuthFailure(res.status)) throw new CalendarAuthError();
        throw new Error(`重建事件失敗：${res.error ?? res.status}`);
    }
    const { error } = await ctx.supabase
        .from(MAPPINGS_TABLE)
        .update({
            google_event_id: res.data.id,
            google_calendar_id: ctx.calendarId,
            synced_value: spec.value,
        })
        .eq('id', map.id);
    if (error) throw new Error(`更新行事曆對應失敗：${error.message}`);
    bumpStat(ctx.stats, 'recreated');
}

/**
 * 同步單一來源欄位：依決策建立 / 更新 / 略過 / 刪除事件並維護 mapping。
 */
export async function syncField(ctx: SyncContext, spec: FieldSpec): Promise<void> {
    const mapping = await readMapping(ctx, spec);
    const action = decideSyncAction(spec.value, mapping);

    switch (action) {
        case 'noop':
            bumpStat(ctx.stats, 'noop');
            return;

        case 'skip': {
            const map = mapping as MappingRow;
            // 子行事曆被刪除重建後，舊 mapping 仍指向失效 calendarId → 必須重建
            if (map.google_calendar_id !== ctx.calendarId) {
                await recreateMappedEvent(ctx, spec, map);
                return;
            }
            const exists = await getEvent(ctx.token, map.google_calendar_id, map.google_event_id);
            if (!exists.ok) {
                if (isAuthFailure(exists.status)) throw new CalendarAuthError();
                if (exists.status === 404 || exists.status === 410) {
                    await recreateMappedEvent(ctx, spec, map);
                    return;
                }
                throw new Error(`確認事件失敗：${exists.error ?? exists.status}`);
            }
            bumpStat(ctx.stats, 'skipped');
            return;
        }

        case 'create': {
            const payload = buildEventPayload({ title: spec.title, value: spec.value as string, allDay: spec.allDay });
            const res = await insertEvent(ctx.token, ctx.calendarId, payload);
            if (!res.ok || !res.data?.id) {
                if (isAuthFailure(res.status)) throw new CalendarAuthError();
                throw new Error(`建立事件失敗：${res.error ?? res.status}`);
            }
            await persistMappingUpsert(ctx, {
                user_id: ctx.userId,
                source_table: spec.sourceTable,
                source_id: spec.sourceId,
                source_field: spec.sourceField,
                google_event_id: res.data.id,
                google_calendar_id: ctx.calendarId,
                synced_value: spec.value,
            });
            bumpStat(ctx.stats, 'created');
            return;
        }

        case 'update': {
            const map = mapping as MappingRow;
            const payload = buildEventPayload({ title: spec.title, value: spec.value as string, allDay: spec.allDay });
            const calendarForPatch = map.google_calendar_id === ctx.calendarId ? map.google_calendar_id : ctx.calendarId;
            const res = await patchEvent(ctx.token, calendarForPatch, map.google_event_id, payload);

            if (res.ok) {
                const { error } = await ctx.supabase
                    .from(MAPPINGS_TABLE)
                    .update({ synced_value: spec.value, google_calendar_id: ctx.calendarId })
                    .eq('id', map.id);
                if (error) throw new Error(`更新行事曆對應失敗：${error.message}`);
                bumpStat(ctx.stats, 'updated');
                return;
            }
            if (isAuthFailure(res.status)) throw new CalendarAuthError();

            // 事件在 Google 端被刪除（404）→ 重新建立並更新 mapping
            if (res.status === 404) {
                await recreateMappedEvent(ctx, spec, map);
                return;
            }
            throw new Error(`更新事件失敗：${res.error ?? res.status}`);
        }

        case 'delete': {
            const map = mapping as MappingRow;
            const res = await deleteEvent(ctx.token, map.google_calendar_id, map.google_event_id);
            if (!res.ok && isAuthFailure(res.status)) throw new CalendarAuthError();
            const { error } = await ctx.supabase.from(MAPPINGS_TABLE).delete().eq('id', map.id);
            if (error) throw new Error(`刪除行事曆對應失敗：${error.message}`);
            bumpStat(ctx.stats, 'deleted');
            return;
        }
    }
}

function formatTaipeiTime(iso: string): string {
    return new Intl.DateTimeFormat('zh-TW', {
        timeZone: CALENDAR_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(iso));
}

const MILESTONE_LABELS: Record<string, string> = {
    contract_date: '簽約',
    seal_date: '用印',
    tax_payment_date: '完稅',
    transfer_date: '過戶',
    handover_date: '交屋',
};

const APPOINTMENT_LABELS: Record<string, string> = {
    sign_appointment: '簽約',
    seal_appointment: '用印',
    tax_appointment: '完稅',
    handover_appointment: '交屋',
};

const TAX_LABELS: Record<string, string> = {
    land_value_tax_deadline: '土增稅',
    deed_tax_deadline: '契稅',
    land_tax_deadline: '地價稅',
    house_tax_deadline: '房屋稅',
};

/** 已結案 / 解約：不同步到行事曆（既有事件會被刪除）。 */
const CLOSED_STATUSES = new Set<string>([...CASE_INACTIVE_STATUSES, '已結案', '結案', '已關閉', '解約']);

function isClosedStatus(status: string | null | undefined): boolean {
    return !!status && CLOSED_STATUSES.has(status);
}

type Row = Record<string, unknown> | null;

function str(row: Row, field: string): string | null {
    const v = row?.[field];
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'string') return v;
    if (v instanceof Date) return v.toISOString();
    return String(v);
}

function withStats(ctx: SyncContext): SyncContext {
    return ctx.stats ? ctx : { ...ctx, stats: emptyStats() };
}

async function resolveContext(injected?: SyncContext): Promise<SyncContext | CalendarSyncResult> {
    if (injected) return withStats(injected);
    const built = await buildContext();
    if ('status' in built) return built;
    return withStats(built);
}

/**
 * 同步單一案件的里程碑五日期 + 四約定 + 財務四稅限。
 */
export async function syncCase(caseId: string, injected?: SyncContext): Promise<CalendarSyncResult> {
    try {
        const ctx = await resolveContext(injected);
        if ('status' in ctx) return ctx; // 取 ctx 失敗（未登入 / 需重新授權）

        const { data: caseRow } = await ctx.supabase
            .from('cases')
            .select('status, case_number, buyer_name, seller_name')
            .eq('id', caseId)
            .maybeSingle();
        const caseNumber = (caseRow?.case_number as string) ?? '';
        const parties = [caseRow?.buyer_name, caseRow?.seller_name].filter(Boolean).join('/');
        // 只同步「承辦中」案件；已結案（或查無此案）→ 一律刪除其既有事件（value 視為 null）。
        const active = !!caseRow && !isClosedStatus(caseRow.status as string | null);

        const { data: m } = await ctx.supabase.from('milestones').select('*').eq('case_id', caseId).maybeSingle();
        const { data: f } = await ctx.supabase.from('financials').select('*').eq('case_id', caseId).maybeSingle();

        const specs: FieldSpec[] = [];

        for (const [field, label] of Object.entries(MILESTONE_LABELS)) {
            specs.push({
                sourceTable: 'milestones',
                sourceId: caseId,
                sourceField: field,
                value: active ? str(m as Row, field) : null,
                allDay: true,
                title: buildEventTitle({ kind: 'milestone', label, parties, caseNumber }),
            });
        }

        for (const [field, label] of Object.entries(APPOINTMENT_LABELS)) {
            const value = active ? str(m as Row, field) : null;
            specs.push({
                sourceTable: 'milestones',
                sourceId: caseId,
                sourceField: field,
                value,
                allDay: false,
                title: buildEventTitle({ kind: 'appointment', label, time: value ? formatTaipeiTime(value) : '', caseNumber }),
            });
        }

        for (const [field, label] of Object.entries(TAX_LABELS)) {
            specs.push({
                sourceTable: 'financials',
                sourceId: caseId,
                sourceField: field,
                value: active ? str(f as Row, field) : null,
                allDay: true,
                title: buildEventTitle({ kind: 'tax', label, caseNumber }),
            });
        }

        for (const spec of specs) {
            await syncField(ctx, spec);
        }
        return { status: 'ok' };
    } catch (e) {
        return toResult(e);
    }
}

/**
 * 同步單一待辦：僅 is_deleted=false 且未完成且有 due_date 者建立定時事件，否則刪事件。
 */
export async function syncTodo(todoId: string, injected?: SyncContext): Promise<CalendarSyncResult> {
    try {
        const ctx = await resolveContext(injected);
        if ('status' in ctx) return ctx;

        const { data: todo } = await ctx.supabase
            .from('todos')
            .select('id, content, due_date, is_completed, is_deleted, case_id')
            .eq('id', todoId)
            .maybeSingle();

        const dueDate = str(todo as Row, 'due_date');
        const active = !!todo && !todo.is_deleted && !todo.is_completed && !!dueDate;

        let caseNumber = '';
        if (active && todo?.case_id) {
            const { data: caseRow } = await ctx.supabase
                .from('cases')
                .select('case_number')
                .eq('id', todo.case_id)
                .maybeSingle();
            caseNumber = (caseRow?.case_number as string) ?? '';
        }

        await syncField(ctx, {
            sourceTable: 'todos',
            sourceId: todoId,
            sourceField: 'due_date',
            value: active ? dueDate : null,
            allDay: false,
            title: active ? buildEventTitle({ kind: 'todo', content: str(todo as Row, 'content') ?? '', caseNumber }) : '待辦',
        });
        return { status: 'ok' };
    } catch (e) {
        return toResult(e);
    }
}

/**
 * 既有資料一次性回填：先 provisioning（buildContext），再逐案 syncCase + 逐待辦 syncTodo。
 * 僅處理登入者 user_id 名下資料（由 RLS 自動限縮）。可重跑（idempotent）：
 * 未變更的欄位透過 syncField 的 synced_value 去重，不重複建立、不呼叫 Google API。
 */
export async function backfillAll(injected?: SyncContext): Promise<CalendarSyncResult> {
    const baseCtx = injected ?? (await buildContext());
    if ('status' in baseCtx) return baseCtx;

    const stats = emptyStats();
    const ctx: SyncContext = { ...baseCtx, stats };

    const { data: cases } = await ctx.supabase.from('cases').select('id, status');
    const activeCases = (cases ?? []).filter(
        (c) => !isClosedStatus((c as { status?: string }).status ?? null)
    );
    let firstError: string | undefined;

    for (const c of cases ?? []) {
        const r = await syncCase(c.id as string, ctx);
        if (r.status === 'needs_reauth') return r;
        if (r.status === 'error' && !firstError) firstError = r.error;
    }

    const { data: todos } = await ctx.supabase
        .from('todos')
        .select('id')
        .eq('is_deleted', false)
        .eq('is_completed', false);
    for (const t of todos ?? []) {
        const r = await syncTodo(t.id as string, ctx);
        if (r.status === 'needs_reauth') return r;
        if (r.status === 'error' && !firstError) firstError = r.error;
    }

    const eventsWritten = stats.created + stats.updated + stats.recreated;
    let googleEventCount: number | undefined;
    const listed = await listEvents(ctx.token, ctx.calendarId);
    if (listed.ok) {
        googleEventCount = listed.data?.items?.length ?? 0;
    }

    const baseResult = {
        casesProcessed: cases?.length ?? 0,
        activeCasesProcessed: activeCases.length,
        todosProcessed: todos?.length ?? 0,
        eventsWritten,
        googleEventCount,
        stats,
    };

    if (firstError) {
        return { status: 'error', error: firstError, ...baseResult };
    }

    return { status: 'ok', ...baseResult };
}

/**
 * 取得伺服器端同步上下文（session user + access token + 專用行事曆）。
 * 回傳 CalendarSyncResult 表示無法取得（未登入 / 需重新授權）。
 */
export async function buildContext(): Promise<SyncContext | CalendarSyncResult> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: 'error', error: '未登入' };

    const token = await getAccessToken();
    if (!token) return { status: 'needs_reauth' };

    try {
        const calendarId = await provisionCaseCalendar(supabase, user.id, token);
        return { supabase, userId: user.id, token, calendarId };
    } catch (e) {
        return toResult(e);
    }
}

function toResult(e: unknown): CalendarSyncResult {
    if (e instanceof CalendarAuthError) return { status: 'needs_reauth' };
    console.error('[calendarSync] 同步失敗:', e);
    return { status: 'error', error: e instanceof Error ? e.message : String(e) };
}
