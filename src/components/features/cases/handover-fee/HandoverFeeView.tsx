import { listFeeHistory, listScrivenersWithDefaults, listUnpaidFees } from '@/app/actions/handoverFees';
import { currentMonthInTaipei, todayInTaipei } from '@/domain/handover-fee/agingUtils';
import { FeeHistory } from './FeeHistory';
import { HandoverFeeForm } from './HandoverFeeForm';
import { UnpaidFeeList } from './UnpaidFeeList';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

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
    const selectedMonth = month && MONTH_RE.test(month) ? month : currentMonthInTaipei();
    const selectedScrivener = scrivenerId ?? '';

    const [scrivenersResult, unpaidResult, historyResult] = await Promise.all([
        listScrivenersWithDefaults(),
        listUnpaidFees(),
        listFeeHistory({ month: selectedMonth, scrivenerId: selectedScrivener || undefined }),
    ]);

    const scriveners = scrivenersResult.success ? scrivenersResult.data : [];
    const activeScriveners = scriveners.filter((s) => !s.archived_at);

    return (
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
    );
}
