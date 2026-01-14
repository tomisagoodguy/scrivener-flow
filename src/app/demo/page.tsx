'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';

export default function DemoPage() {
    const [cases, setCases] = useState<DemoCase[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    const fetchCases = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('cases')
                .select(`
          *,
          milestones (*),
          financials (*)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCases(data as unknown as DemoCase[]);
        } catch (err: any) {
            console.error('Error fetching cases:', err);
            setError(err.message || 'Failed to fetch cases.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
        document.documentElement.setAttribute('data-theme', 'dark');
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const currentCase = cases[selectedIndex];

    const handleAddMockCase = async () => {
        try {
            const { data: caseData, error: caseError } = await supabase
                .from('cases')
                .insert({
                    case_number: `AA${Math.floor(Math.random() * 1000000)}`,
                    status: 'Processing',
                    handler: '子翔',
                    buyer_name: '買方-' + Math.floor(Math.random() * 100),
                    seller_name: '賣方-' + Math.floor(Math.random() * 100),
                    agent_name: '王小明',
                    city: '台北',
                    district: '大安',
                    property_type: 'Building',
                    build_type: 'New_System',
                    today_completion: '新制 (無戶 / 報稅中)',
                    other_notes: '1/20 代償 1/25 塗銷',
                    notes: '一般案件'
                })
                .select()
                .single();

            if (caseError) throw caseError;

            const caseId = caseData.id;
            await supabase.from('milestones').insert({
                case_id: caseId,
                contract_date: '2026-01-01',
                sign_diff_date: '2026-01-03',
                seal_date: '2026-01-15',
                fee_precollect_date: '2026-01-20'
            });

            await supabase.from('financials').insert({
                case_id: caseId,
                total_price: 18500000,
                vat_type: '一般',
                buyer_bank: '華南銀行 (內湖)',
                seller_bank: '第一銀行'
            });

            await fetchCases();
            setSelectedIndex(0);
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const formatDate = (isoStr?: string) => {
        if (!isoStr) return '--';
        if (isoStr.includes('T')) return isoStr.split('T')[0];
        return isoStr;
    };

    return (
        <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
            {/* Excel-Style Top Header */}
            <header className="bg-[#1a1a1a] dark:bg-[#0f172a] text-white p-3 flex items-center justify-between border-b border-black/20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-green-600 px-2 py-0.5 rounded text-[10px] font-bold">EXCEL</div>
                        <span className="font-bold text-sm tracking-tight text-slate-300">案件進度管理系統 v2.0</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10 hidden md:block"></div>
                    <div className="hidden md:flex gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                        <span>File</span>
                        <span>Edit</span>
                        <span>View</span>
                        <span className="text-primary-foreground/80">Data Analysis</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="text-xl opacity-70 hover:opacity-100 transition">{theme === 'dark' ? '☀️' : '🌙'}</button>
                    <button onClick={handleAddMockCase} className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded transition uppercase">Add Case</button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto bg-[var(--background)] p-4 md:p-6 lg:p-8 pb-20">
                {loading ? (
                    <div className="flex items-center justify-center h-full opacity-50 animate-pulse">Loading Workbook...</div>
                ) : !currentCase ? (
                    <div className="text-center py-40 opacity-30 italic">No data found in current sheet.</div>
                ) : (
                    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
                        {/* Case Header Card */}
                        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-sm overflow-hidden shadow-xl">
                            <div className="bg-slate-800 dark:bg-slate-900 border-b border-[var(--border-color)] p-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-primary">{currentCase.case_number}</div>
                                    <h2 className="text-2xl font-black">{currentCase.city}{currentCase.district} • {currentCase.buyer_name}</h2>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-bold uppercase py-1 px-3 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">承辦: {currentCase.handler || '團隊'}</span>
                                    <span className="text-[10px] font-bold uppercase py-1 px-3 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">{currentCase.status}</span>
                                </div>
                            </div>

                            {/* Today's Special Detail - Excel's "今日須完成" */}
                            <div className="p-4 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-4">
                                <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">實務細節</span>
                                <div className="font-bold text-sm text-orange-500">{currentCase.today_completion || '舊制(本戶 / 資料補件中)'}</div>
                            </div>

                            {/* Grid for Master Content */}
                            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-[var(--border-color)] divide-[var(--border-color)]">
                                {/* People */}
                                <div className="p-4 space-y-4">
                                    <div>
                                        <div className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mb-1">關係人資訊</div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-baseline"><span className="text-xs opacity-60">買方</span> <span className="font-bold">{currentCase.buyer_name}</span></div>
                                            <div className="flex justify-between items-baseline"><span className="text-xs opacity-60">賣方</span> <span className="font-bold">{currentCase.seller_name}</span></div>
                                            <div className="flex justify-between items-baseline"><span className="text-xs opacity-60">案源</span> <span className="text-sm">{currentCase.agent_name || '--'}</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dates - The "Case Progress" row */}
                                <div className="p-4 md:col-span-2">
                                    <div className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mb-3">進度時程記錄</div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(() => {
                                            const m = (currentCase.milestones?.[0] || {}) as any;
                                            return [
                                                { label: '簽約', date: m.contract_date, color: 'border-blue-500/30 bg-blue-500/5' },
                                                { label: '簽差', date: m.sign_diff_date, color: 'border-slate-500/30' },
                                                { label: '用印', date: m.seal_date, color: 'border-purple-500/30' },
                                                { label: '預收', date: m.fee_precollect_date, color: 'border-slate-500/30' },
                                                { label: '完稅', date: m.tax_payment_date, color: 'border-amber-500/30 bg-amber-500/5' },
                                                { label: '交屋', date: m.handover_date, color: 'border-emerald-500/30 bg-emerald-500/5' },
                                            ].map((d, i) => (
                                                <div key={i} className={`p-2 border rounded-sm ${d.color}`}>
                                                    <div className="text-[9px] font-bold opacity-50 mb-1">{d.label}</div>
                                                    <div className="font-mono text-xs font-bold tracking-tighter">{formatDate(d.date)}</div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                {/* Financials / Loans */}
                                <div className="p-4 space-y-4">
                                    <div>
                                        <div className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mb-1">貸款與類型</div>
                                        <div className="space-y-3">
                                            {(() => {
                                                const f = (currentCase.financials?.[0] || {}) as any;
                                                return (
                                                    <>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-sky-500">B貸款 (買方)</div>
                                                            <div className="text-xs font-medium truncate">{f.buyer_bank || '尚未核貸'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-rose-500">S貸款 (賣方)</div>
                                                            <div className="text-xs font-medium truncate">{f.seller_bank || '無貸款'}</div>
                                                        </div>
                                                        <div className="pt-2 border-t border-[var(--border-color)] flex justify-between">
                                                            <span className="text-[10px] opacity-40">稅費類型</span>
                                                            <span className="text-[10px] font-bold">{f.vat_type || '一般'}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Notes (Excel's Remarks) */}
                            <div className="bg-slate-100 dark:bg-black/20 p-4 border-t border-[var(--border-color)] grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex gap-3">
                                    <span className="text-[10px] font-bold opacity-30 mt-0.5">備註:</span>
                                    <p className="text-sm opacity-70 leading-relaxed">{currentCase.notes || '--'}</p>
                                </div>
                                <div className="flex gap-3 border-l-0 md:border-l border-[var(--border-color)] md:pl-4">
                                    <span className="text-[10px] font-bold text-primary mt-0.5">其他備註:</span>
                                    <p className="text-sm text-primary/80 font-medium leading-relaxed italic">{currentCase.other_notes || '目前尚無代償計畫'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Master View Statistics (Optional Excel feel) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-[var(--surface)] border border-[var(--border-color)] rounded-sm">
                                <div className="text-[9px] font-bold opacity-40 uppercase">總成交金額估算</div>
                                <div className="text-xl font-black text-emerald-500 mt-1">${((currentCase.financials?.[0] as any)?.total_price || 0).toLocaleString()}</div>
                            </div>
                            {/* Add more metrics if needed */}
                        </div>
                    </div>
                )}
            </main>

            {/* Excel Sheet Tabs at Bottom */}
            <footer className="fixed bottom-0 left-0 right-0 bg-[#f3f3f3] dark:bg-[#1a1a1a] border-t border-[#ccc] dark:border-[#333] h-10 flex items-stretch z-50">
                <div className="flex items-center px-4 border-r border-[#ccc] dark:border-[#333] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                    <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
                </div>

                <div className="flex-1 flex overflow-x-auto excel-scrollbar">
                    {cases.map((c, i) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedIndex(i)}
                            className={`flex items-center px-6 min-w-[140px] max-w-[240px] border-r border-[#ccc] dark:border-[#333] text-[11px] font-bold transition-all relative ${selectedIndex === i
                                ? 'bg-white dark:bg-[#1e293b] text-primary shadow-[inset_0_-3px_0_var(--primary)]'
                                : 'text-[var(--foreground)] opacity-50 hover:bg-white/50 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className="truncate">{c.case_number} - {c.buyer_name}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center px-4 border-l border-[#ccc] dark:border-[#333] bg-primary text-white text-[9px] font-black uppercase tracking-widest">
                    MASTER WORKBOOK
                </div>
            </footer>

            <style jsx global>{`
        .excel-scrollbar::-webkit-scrollbar { height: 4px; }
        .excel-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        [data-theme='light'] body { background-color: #e5e7eb; }
      `}</style>
        </div>
    );
}
