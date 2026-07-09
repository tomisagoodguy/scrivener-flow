import { getManagers, getManagerDualTrack } from '@/app/actions/getManagerDualTrack';
import ManagerPicker from './components/ManagerPicker';
import EtfHoldingsPanel from './components/EtfHoldingsPanel';
import FundHoldingsPanel from './components/FundHoldingsPanel';
import GapTablePanel from './components/GapTablePanel';
import SignalsPanel from './components/SignalsPanel';

export const dynamic = 'force-dynamic';

export default async function ManagerDualTrackPage({
    searchParams,
}: {
    searchParams: Promise<{ manager?: string }>;
}) {
    const managers = await getManagers();

    if (managers.length === 0) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
                <div className="glass-card p-8 text-center">
                    <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">經理人視角</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        尚無經理人對照資料，請確認 <code className="px-1 rounded bg-slate-100 dark:bg-slate-800">fund_manager_map</code> migration 是否已套用。
                    </p>
                </div>
            </main>
        );
    }

    const { manager: rawManager } = await searchParams;
    const selected = managers.find((m) => m.manager === rawManager)?.manager ?? managers[0].manager;

    const detail = await getManagerDualTrack(selected);

    return (
        <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-5 animate-fade-in">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">經理人視角</h1>
                <p className="text-xs text-slate-400 mt-1">
                    ETF 訊號（日頻近似，來自持股每日揭露差異）vs 基金訊號（月頻真雙軌，來自 SITCA / MOPS 月報）——兩者口徑不同，不可直接互相驗證，僅供交叉參考。
                </p>
            </div>

            <ManagerPicker managers={managers} selected={selected} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EtfHoldingsPanel
                    holdings={detail.etfHoldings}
                    dataDate={detail.etfDataDate}
                    etfCodes={detail.etfCodes}
                />
                <FundHoldingsPanel
                    holdings={detail.fundHoldings}
                    ym={detail.fundYm}
                    currentYm={detail.currentYm}
                    fundShorts={detail.fundShorts}
                />
            </div>

            <GapTablePanel gapTable={detail.gapTable} />

            <SignalsPanel signals={detail.signals} />
        </main>
    );
}
