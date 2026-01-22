interface InfoItemProps {
    label: string;
    value?: string | null;
    icon: React.ReactNode;
    fullWidth?: boolean;
}

/**
 * InfoItem 組件
 * 顯示標籤與值的資訊卡片
 */
export function InfoItem({ label, value, icon, fullWidth }: InfoItemProps) {
    if (!value) return null;

    return (
        <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 ${fullWidth ? 'col-span-2' : ''}`}>
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1.5">
                {icon}
                {label}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-all">
                {value}
            </div>
        </div>
    );
}
