import Link from 'next/link';
import type { SortKey, SortDir } from '@/lib/investment/equityPageData';

export function SortableHeader({
    label,
    sortKey,
    currentSort,
    currentDir,
}: {
    label: string;
    sortKey: SortKey;
    currentSort: SortKey | null;
    currentDir: SortDir;
}) {
    const isActive = currentSort === sortKey;
    const nextDir: SortDir = isActive && currentDir === 'desc' ? 'asc' : 'desc';
    const arrow = isActive ? (currentDir === 'asc' ? ' ↑' : ' ↓') : '';
    return (
        <Link
            href={`?sort=${sortKey}&dir=${nextDir}`}
            className={`whitespace-nowrap hover:text-blue-600 transition-colors cursor-pointer ${isActive ? 'text-blue-600 font-semibold' : ''}`}
        >
            {label}{arrow}
        </Link>
    );
}
