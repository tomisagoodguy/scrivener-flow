export function HolderPctCell({ value, positiveGood }: { value: number | null; positiveGood: boolean }) {
    if (value == null) return <span className="text-gray-400">—</span>;
    const isGood = positiveGood ? value > 0 : value < 0;
    const color = isGood ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    return (
        <span className={`font-semibold ${color}`}>
            {value > 0 ? '+' : ''}{value.toFixed(2)}pp
        </span>
    );
}
