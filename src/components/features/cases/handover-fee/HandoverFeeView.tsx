import { listFeeHistory, listScrivenersWithDefaults, listUnpaidFees } from '@/app/actions/handoverFees';
import { todayInTaipei } from '@/domain/handover-fee/agingUtils';
import { normalizeHistoryParams } from '@/domain/handover-fee/historyParams';
import { FeeHistory } from './FeeHistory';
import { HandoverFeeEditProvider } from './HandoverFeeEditContext';
import { HandoverFeeForm } from './HandoverFeeForm';
import { UnpaidFeeList } from './UnpaidFeeList';

interface HandoverFeeViewProps {
    month?: string;
    scrivenerId?: string;
}

function LoadError({ message }: { message: string }) {
    return (
        <p role="alert" className="glass-card p-5 text-sm font-bold text-red-600 dark:text-red-400">
            遞牌費資料讀取失敗：{message}
        </p>
    );
}

/** `/cases?status=HandoverFee`：新增表單、未收款清單、歷史紀錄 */
export default async function HandoverFeeView({ month, scrivenerId }: HandoverFeeViewProps) {
    const today = todayInTaipei();
    // 書籤或手打的不合法參數退回預設值，避免整個歷史區塊只剩錯誤訊息
    const { month: selectedMonth, scrivenerId: selectedScrivener } = normalizeHistoryParams(month, scrivenerId);

    const [scrivenersResult, unpaidResult, historyResult] = await Promise.all([
        listScrivenersWithDefaults(),
        listUnpaidFees(),
        listFeeHistory({ month: selectedMonth, scrivenerId: selectedScrivener || undefined }),
    ]);

    const scriveners = scrivenersResult.success ? scrivenersResult.data : [];
    const activeScriveners = scriveners.filter((s) => !s.archived_at);

    return (
        <HandoverFeeEditProvider>
            <div className="space-y-6">
                {!scrivenersResult.success && <LoadError message={scrivenersResult.error} />}
                <HandoverFeeForm scriveners={activeScriveners} defaultDate={today} />
                {unpaidResult.success ? (
                    <UnpaidFeeList fees={unpaidResult.data} today={today} />
                ) : (
                    <LoadError message={unpaidResult.error} />
                )}
                {historyResult.success ? (
                    <FeeHistory
                        fees={historyResult.data}
                        scriveners={scriveners}
                        month={selectedMonth}
                        scrivenerId={selectedScrivener}
                    />
                ) : (
                    <LoadError message={historyResult.error} />
                )}
            </div>
        </HandoverFeeEditProvider>
    );
}
