'use client';

import { useEffect, useRef } from 'react';
import type { IChartApi } from 'lightweight-charts';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import { SIGNAL_META, type SignalKey } from './BareKChartConfig';
import { createKLinePanel, createVolumePanel, createMarginPanel, createRevenuePanel, createChipsPanel } from './BareKChartPanels';

interface Props {
    snapshot: BareKSnapshot;
    stockName?: string;
    strategies?: string[];
}

export function BareKChart({ snapshot, stockName, strategies }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartsRef = useRef<IChartApi[]>([]);
    const p1Ref = useRef<HTMLDivElement>(null);
    const p3Ref = useRef<HTMLDivElement>(null);
    const p4Ref = useRef<HTMLDivElement>(null);
    const p5Ref = useRef<HTMLDivElement>(null);
    const p6Ref = useRef<HTMLDivElement>(null);

    const { ohlcv, mas, signals, margin, revenue, inv_chips, summary } = snapshot;
    const lastClose  = summary.last_price;
    const lastH260   = mas.h260.at(-1)?.value ?? null;
    const distPct    = summary.dist_260_pct;
    const distColor  = distPct === null ? '#555' : distPct >= -2 ? '#27AE60' : distPct >= -10 ? '#F39C12' : '#E74C3C';
    const sigs       = summary.signals;
    const lastDate   = ohlcv.at(-1)?.date ?? '';

    useEffect(() => {
        if (!p1Ref.current || !p3Ref.current || !p4Ref.current || !p5Ref.current || !p6Ref.current) return;
        const w = containerRef.current?.clientWidth ?? 800;
        chartsRef.current.forEach(c => c.remove());
        chartsRef.current = [];

        const c1 = createKLinePanel(p1Ref.current, w, ohlcv, mas);
        const c3 = createVolumePanel(p3Ref.current, w, ohlcv);
        const c4 = createMarginPanel(p4Ref.current, w, margin);
        const c5 = createRevenuePanel(p5Ref.current, w, revenue);
        const c6 = createChipsPanel(p6Ref.current, w, inv_chips);
        chartsRef.current = [c1, c3, c4, c5, c6];

        const slaves = [c3, c4, c5, c6];
        c1.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (!range) return;
            slaves.forEach(s => s.timeScale().setVisibleLogicalRange(range));
        });
        c1.timeScale().fitContent();
        const initRange = c1.timeScale().getVisibleLogicalRange();
        if (initRange) slaves.forEach(s => s.timeScale().setVisibleLogicalRange(initRange));

        const ro = new ResizeObserver(() => {
            const newW = containerRef.current?.clientWidth ?? 800;
            chartsRef.current.forEach(c => c.applyOptions({ width: newW }));
        });
        if (containerRef.current) ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chartsRef.current.forEach(c => c.remove());
            chartsRef.current = [];
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshot]);

    return (
        <div ref={containerRef} className="w-full">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800 text-lg">{snapshot.stock_id}</span>
                    {stockName && <span className="text-gray-500">{stockName}</span>}
                    <span className="text-xs text-gray-400">近 {ohlcv.length} 日</span>
                    <span className="text-xs text-gray-400">{lastDate}</span>
                    {strategies && strategies.length > 0 && strategies.map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-orange-50 text-orange-500 border border-orange-200 rounded-full">{s}</span>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-sm shrink-0">
                    <span className="font-bold text-gray-800">{lastClose.toFixed(2)}</span>
                    {lastH260 && <span className="text-gray-400 text-xs">260高 {lastH260.toFixed(2)}</span>}
                    {distPct !== null && (
                        <span className="font-medium text-xs" style={{ color: distColor }}>
                            {distPct > 0 ? '+' : ''}{distPct.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>

            <div className="relative">
                <div ref={p1Ref} />
                <div className="absolute top-2 left-2 z-10 pointer-events-none">
                    <div className="flex gap-1.5 flex-wrap bg-white/80 rounded px-2 py-1 text-[11px] border border-gray-200/60">
                        {SIGNAL_META.map(({ key, label, color }) => {
                            const active = sigs[key as SignalKey];
                            return <span key={key} style={{ color: active ? color : '#bbb' }}>{active ? '✅' : '❌'} {label}</span>;
                        })}
                    </div>
                </div>
            </div>

            <SignalPanel signals={signals} />
            <PanelLabel text="成交量" />
            <div ref={p3Ref} />
            <PanelLabel text={`融資維持率  最新 ${summary.last_margin?.toFixed(1) ?? '--'}%`} />
            <div ref={p4Ref} />
            <PanelLabel text={`月營收 YOY / MOM  最新 YOY ${summary.last_yoy !== null ? `${summary.last_yoy > 0 ? '+' : ''}${summary.last_yoy.toFixed(1)}%` : '--'}  MOM ${summary.last_mom !== null ? `${summary.last_mom > 0 ? '+' : ''}${summary.last_mom.toFixed(1)}%` : '--'}`} />
            <div ref={p5Ref} />
            <PanelLabel text={`集保籌碼  大戶 ${summary.last_big_chg !== null ? `${summary.last_big_chg > 0 ? '+' : ''}${summary.last_big_chg.toFixed(2)}%` : '--'}  籌碼PR ${summary.last_pr_rank?.toFixed(0) ?? '--'}`} />
            <div ref={p6Ref} />
        </div>
    );
}

function PanelLabel({ text }: { text: string }) {
    return <div className="text-[10px] text-gray-400 px-2 pt-2 pb-0.5 select-none">{text}</div>;
}

function SignalPanel({ signals }: { signals: BareKSnapshot['signals'] }) {
    if (!signals || signals.length === 0) return null;
    const visible = signals.slice(-120);
    return (
        <div className="relative mt-0.5 mb-0.5 overflow-hidden" style={{ height: 40 }}>
            <div className="absolute top-0 left-0 text-[9px] text-gray-400 px-1 leading-none z-10">訊號條</div>
            <div className="flex" style={{ height: '100%' }}>
                {visible.map((daySignal, di) => (
                    <div key={di} className="flex flex-col flex-1 gap-0.5 pt-3">
                        {SIGNAL_META.map(({ key, color }) => {
                            const active = daySignal[key as SignalKey];
                            return (
                                <div key={key} className="flex-1 rounded-sm" style={{ background: active ? color : 'rgba(180,180,180,0.15)' }} />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
