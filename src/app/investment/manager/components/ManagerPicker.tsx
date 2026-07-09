import Link from 'next/link';
import type { ManagerInfo } from '@/app/actions/getManagerDualTrack';

export default function ManagerPicker({
    managers,
    selected,
}: {
    managers: ManagerInfo[];
    selected: string | null;
}) {
    return (
        <div className="glass-card p-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                經理人清單
                <span className="ml-2 text-xs font-normal text-slate-400">{managers.length} 位</span>
            </h2>
            <div className="flex flex-wrap gap-2">
                {managers.map((m) => {
                    const isActive = m.manager === selected;
                    return (
                        <Link
                            key={m.manager}
                            href={`/investment/manager?manager=${encodeURIComponent(m.manager)}`}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 ${
                                isActive
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
                            }`}
                        >
                            {m.manager}
                            {m.etfCodes.length > 0 && (
                                <span className="ml-1 opacity-70">{m.etfCodes.join('/')}</span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
