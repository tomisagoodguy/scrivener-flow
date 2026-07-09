'use server';

import { createClient } from '@/lib/supabase/server';

// ── 型別 ──────────────────────────────────────────────────────────────────

export interface ManagerInfo {
    manager: string;
    etfCodes: string[];
    fundShorts: string[];
}

export interface EtfHoldingItem {
    etf_code: string;
    stock_code: string;
    stock_name: string | null;
    weight: number;
    rank: number;
}

export interface FundHoldingItem {
    fund_short: string;
    ym: string;
    stock_code: string;
    stock_name: string | null;
    rank: number | null;
    pct: number | null;
    source: 'sitca' | 'mops';
}

export interface GapItem {
    stock_code: string;
    stock_name: string | null;
    side: 'fund-only' | 'etf-only';
}

export interface DualTrackSignalItem {
    id: number;
    signal_type: string;
    stock_code: string;
    period: string;
    strength: number;
    fund_names: string[];
    metadata: Record<string, unknown>;
}

export interface ManagerDualTrackResult {
    manager: string;
    etfCodes: string[];
    fundShorts: string[];
    etfHoldings: EtfHoldingItem[];
    etfDataDate: string | null;
    fundHoldings: FundHoldingItem[];
    fundYm: string | null;
    currentYm: string;
    gapTable: GapItem[];
    signals: DualTrackSignalItem[];
}

// ── 內部 Row 型別（unknown + type guard，禁 any）──────────────────────────

interface FundManagerMapRow {
    manager: string;
    etf_code: string | null;
    fund_short: string;
    type: string;
}

interface EtfHoldingsSnapshotRow {
    etf_code: string;
    stock_code: string;
    stock_name: string | null;
    weight: number | null;
    data_date: string;
}

interface FundHoldingsMonthlyRow {
    fund_short: string;
    ym: string;
    stock_code: string;
    stock_name: string | null;
    rank: number | null;
    pct: number | null;
    source: string;
}

interface FundSignalRow {
    id: number;
    signal_type: string;
    stock_code: string;
    period: string;
    strength: number;
    fund_names: unknown;
    metadata: unknown;
}

function toFundNames(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
}

function toMetadata(value: unknown): Record<string, unknown> {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

function getCurrentYm(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
}

// ── 經理人清單 ────────────────────────────────────────────────────────────

export async function getManagers(): Promise<ManagerInfo[]> {
    const supabase = await createClient();

    const { data } = await supabase
        .from('fund_manager_map')
        .select('manager, etf_code, fund_short, type')
        .is('valid_to', null)
        .order('manager', { ascending: true });

    const rows = (data ?? []) as FundManagerMapRow[];

    const byManager = new Map<string, ManagerInfo>();
    for (const row of rows) {
        const entry = byManager.get(row.manager) ?? {
            manager: row.manager,
            etfCodes: [],
            fundShorts: [],
        };
        if (row.type === 'etf' && row.etf_code && !entry.etfCodes.includes(row.etf_code)) {
            entry.etfCodes.push(row.etf_code);
        }
        if (!entry.fundShorts.includes(row.fund_short)) {
            entry.fundShorts.push(row.fund_short);
        }
        byManager.set(row.manager, entry);
    }

    return Array.from(byManager.values());
}

// ── 經理人雙軌對照 ────────────────────────────────────────────────────────

export async function getManagerDualTrack(manager: string): Promise<ManagerDualTrackResult> {
    const supabase = await createClient();
    const currentYm = getCurrentYm();

    const empty: ManagerDualTrackResult = {
        manager,
        etfCodes: [],
        fundShorts: [],
        etfHoldings: [],
        etfDataDate: null,
        fundHoldings: [],
        fundYm: null,
        currentYm,
        gapTable: [],
        signals: [],
    };

    const { data: mapData } = await supabase
        .from('fund_manager_map')
        .select('manager, etf_code, fund_short, type')
        .eq('manager', manager)
        .is('valid_to', null);

    const mapRows = (mapData ?? []) as FundManagerMapRow[];
    if (mapRows.length === 0) return empty;

    const etfCodes = Array.from(
        new Set(mapRows.filter((r) => r.type === 'etf' && r.etf_code).map((r) => r.etf_code as string)),
    );
    const fundShorts = Array.from(new Set(mapRows.map((r) => r.fund_short)));

    // ── ETF 持股（每日揭露，Top 20）──────────────────────────────────────
    const etfHoldings: EtfHoldingItem[] = [];
    let etfDataDate: string | null = null;

    if (etfCodes.length > 0) {
        const { data: dateRows } = await supabase
            .from('etf_holdings_snapshot')
            .select('data_date')
            .in('etf_code', etfCodes)
            .order('data_date', { ascending: false })
            .limit(1);

        etfDataDate = (dateRows?.[0] as { data_date: string } | undefined)?.data_date ?? null;

        if (etfDataDate) {
            const { data: holdingRows } = await supabase
                .from('etf_holdings_snapshot')
                .select('etf_code, stock_code, stock_name, weight, data_date')
                .in('etf_code', etfCodes)
                .eq('data_date', etfDataDate)
                .order('weight', { ascending: false });

            const typedHoldings = (holdingRows ?? []) as EtfHoldingsSnapshotRow[];
            for (const code of etfCodes) {
                const top20 = typedHoldings
                    .filter((h) => h.etf_code === code)
                    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
                    .slice(0, 20);
                etfHoldings.push(
                    ...top20.map((h, idx) => ({
                        etf_code: h.etf_code,
                        stock_code: h.stock_code,
                        stock_name: h.stock_name,
                        weight: h.weight ?? 0,
                        rank: idx + 1,
                    })),
                );
            }
        }
    }

    // ── 基金月報（Top 10，sitca 優先於 mops）──────────────────────────────
    const fundHoldings: FundHoldingItem[] = [];
    let fundYm: string | null = null;

    if (fundShorts.length > 0) {
        const { data: ymRows } = await supabase
            .from('fund_holdings_monthly')
            .select('ym')
            .in('fund_short', fundShorts)
            .order('ym', { ascending: false })
            .limit(1);

        fundYm = (ymRows?.[0] as { ym: string } | undefined)?.ym ?? null;

        if (fundYm) {
            const { data: fundRows } = await supabase
                .from('fund_holdings_monthly')
                .select('fund_short, ym, stock_code, stock_name, rank, pct, source')
                .in('fund_short', fundShorts)
                .eq('ym', fundYm);

            const typedFundRows = (fundRows ?? []) as FundHoldingsMonthlyRow[];

            for (const short of fundShorts) {
                const rowsForFund = typedFundRows.filter((r) => r.fund_short === short);
                const dedup = new Map<string, FundHoldingsMonthlyRow>();
                for (const row of rowsForFund) {
                    const existing = dedup.get(row.stock_code);
                    if (!existing || (existing.source !== 'sitca' && row.source === 'sitca')) {
                        dedup.set(row.stock_code, row);
                    }
                }
                const top10 = Array.from(dedup.values())
                    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                    .slice(0, 10);
                fundHoldings.push(
                    ...top10.map((r) => ({
                        fund_short: r.fund_short,
                        ym: r.ym,
                        stock_code: r.stock_code,
                        stock_name: r.stock_name,
                        rank: r.rank,
                        pct: r.pct,
                        source: r.source as 'sitca' | 'mops',
                    })),
                );
            }
        }
    }

    // ── 雙軌落差表 ────────────────────────────────────────────────────────
    const etfStockMap = new Map<string, string | null>();
    for (const h of etfHoldings) etfStockMap.set(h.stock_code, h.stock_name);

    const fundStockMap = new Map<string, string | null>();
    for (const h of fundHoldings) fundStockMap.set(h.stock_code, h.stock_name);

    const gapTable: GapItem[] = [];
    for (const [code, name] of fundStockMap) {
        if (!etfStockMap.has(code)) gapTable.push({ stock_code: code, stock_name: name, side: 'fund-only' });
    }
    for (const [code, name] of etfStockMap) {
        if (!fundStockMap.has(code)) gapTable.push({ stock_code: code, stock_name: name, side: 'etf-only' });
    }

    // ── 近 3 期 fund_signals（與此經理人基金有交集）─────────────────────
    let signals: DualTrackSignalItem[] = [];

    const { data: periodRows } = await supabase
        .from('fund_signals')
        .select('period')
        .order('period', { ascending: false })
        .limit(200);

    const periods = Array.from(
        new Set(((periodRows ?? []) as { period: string }[]).map((r) => r.period)),
    ).slice(0, 3);

    if (periods.length > 0) {
        const { data: signalRows } = await supabase
            .from('fund_signals')
            .select('id, signal_type, stock_code, period, strength, fund_names, metadata')
            .in('period', periods)
            .order('period', { ascending: false });

        const fundShortSet = new Set(fundShorts);
        const typedSignalRows = (signalRows ?? []) as FundSignalRow[];

        signals = typedSignalRows
            .map((r) => ({
                id: r.id,
                signal_type: r.signal_type,
                stock_code: r.stock_code,
                period: r.period,
                strength: r.strength,
                fund_names: toFundNames(r.fund_names),
                metadata: toMetadata(r.metadata),
            }))
            .filter((s) => s.fund_names.some((name) => fundShortSet.has(name)));
    }

    return {
        manager,
        etfCodes,
        fundShorts,
        etfHoldings,
        etfDataDate,
        fundHoldings,
        fundYm,
        currentYm,
        gapTable,
        signals,
    };
}
