import { createClient } from '@/lib/supabase/server';
import { getConsensusSignals } from '@/app/actions/getConsensusSignals';
import ConsensusSummaryCards from './components/ConsensusSummaryCards';
import ConsensusTable from './components/ConsensusTable';

export const dynamic = 'force-dynamic';

export default async function ConsensusSignalPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8">
                <p className="text-slate-400 text-sm">請先登入以使用共識掃描功能。</p>
            </main>
        );
    }

    const { signals, date } = await getConsensusSignals();

    return (
        <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-5 animate-fade-in">
            <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">共識掃描</h1>
                <span className="text-xs text-slate-400">ETF 加碼 × 投信買超 × 量化選股</span>
                {date && <span className="text-xs text-slate-400 ml-auto">資料日期：{date}</span>}
            </div>

            {signals.length === 0 ? (
                <div className="glass-card p-6 text-center">
                    <p className="text-slate-400 text-sm">目前無資料，請等待今日 Pipeline 執行完成。</p>
                </div>
            ) : (
                <>
                    <ConsensusSummaryCards signals={signals} />
                    <ConsensusTable signals={signals} />
                </>
            )}
        </main>
    );
}
