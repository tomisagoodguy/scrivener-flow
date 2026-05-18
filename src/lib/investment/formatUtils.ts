export function pctClass(val: number | null): string {
    if (val === null) return 'text-gray-400';
    return val >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
}

export function fmtPct(val: number | null): string {
    if (val === null) return '—';
    return `${(val * 100).toFixed(2)}%`;
}

export function fmtAmount(val: number | null): string {
    if (val === null) return '—';
    const yi = val / 1e8;
    return yi >= 1 ? `${yi.toFixed(1)} 億` : `${(val / 1e6).toFixed(0)} 萬`;
}

export function fmtPpChange(val: number | null | undefined): string {
    if (val == null) return '—';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}pp`;
}

export function ppChangeClass(val: number | null | undefined): string {
    if (val == null) return 'text-gray-400';
    return val > 0 ? 'text-rose-600 dark:text-rose-400' : val < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500';
}

export function fmtItBuySell(val: number | null | undefined): string {
    if (val == null) return '—';
    return `${val > 0 ? '+' : ''}${Math.round(val).toLocaleString()}`;
}
