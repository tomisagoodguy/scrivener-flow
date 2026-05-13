import { getEtfFrontrunningEvents } from '@/app/actions/getEtfFrontrunningEvents';
import FrontrunningTable from './FrontrunningTable';

export default async function FrontrunningPage() {
    const events = await getEtfFrontrunningEvents();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">買貴了嗎？</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    ETF 每季公告持股名單前後，成交量是否異常放大——量越大代表消息可能提早外洩，導致你買在高點
                </p>
            </div>

            {events.length === 0 ? (
                <div className="glass-card p-8 text-center text-slate-400 dark:text-slate-500">
                    尚無資料，等待 Pipeline 執行後自動更新
                </div>
            ) : (
                <div className="glass-card p-6">
                    <FrontrunningTable events={events} />
                </div>
            )}
        </div>
    );
}
