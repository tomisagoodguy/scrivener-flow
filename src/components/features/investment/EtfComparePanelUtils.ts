export const OVERLAP_COLORS: Record<number, { bg: string; dark: string; badge: string; badgeDark: string; dot: string }> = {
    2: { bg: 'bg-blue-50/80',   dark: 'dark:bg-blue-900/30',   badge: 'bg-blue-100 text-blue-800',     badgeDark: 'dark:bg-blue-900/50 dark:text-blue-300',   dot: 'bg-blue-400' },
    3: { bg: 'bg-green-50/80',  dark: 'dark:bg-green-900/30',  badge: 'bg-green-100 text-green-800',   badgeDark: 'dark:bg-green-900/50 dark:text-green-300', dot: 'bg-green-400' },
    4: { bg: 'bg-orange-50/80', dark: 'dark:bg-orange-900/30', badge: 'bg-orange-100 text-orange-800', badgeDark: 'dark:bg-orange-900/50 dark:text-orange-300', dot: 'bg-orange-400' },
};

export const TOP_COLOR = {
    bg: 'bg-yellow-50/80', dark: 'dark:bg-yellow-900/30',
    badge: 'bg-yellow-100 text-yellow-800', badgeDark: 'dark:bg-yellow-900/50 dark:text-yellow-300',
    dot: 'bg-yellow-400',
};

export function getOverlapColor(count: number, max: number) {
    if (count === max) return TOP_COLOR;
    return OVERLAP_COLORS[count] ?? OVERLAP_COLORS[2];
}

export function truncateList(list: string[], max: number): { shown: string[]; remaining: number } {
    if (list.length <= max) return { shown: list, remaining: 0 };
    return { shown: list.slice(0, max), remaining: list.length - max };
}
