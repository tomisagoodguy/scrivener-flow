import { getEtfMeta } from '@/lib/investment/etfRegistry';

export function EtfBadge({ etfCode }: { etfCode: string }) {
    const color = getEtfMeta(etfCode)?.color ?? '#64748b';
    return (
        <span
            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
            style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
        >
            {etfCode}
        </span>
    );
}
