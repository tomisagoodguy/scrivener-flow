'use client';

interface MilestoneCountdownProps {
    date: string | null | undefined;
}

function calcDaysRemaining(date: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse as local date to avoid timezone shift
    const [y, m, d] = date.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function MilestoneCountdown({ date }: MilestoneCountdownProps) {
    if (!date) return null;

    const days = calcDaysRemaining(date);

    let label: string;
    let className: string;

    if (days > 7) {
        label = `還有 ${days} 天`;
        className = 'text-green-600 bg-green-50 border-green-200';
    } else if (days >= 3) {
        label = `還有 ${days} 天`;
        className = 'text-amber-600 bg-amber-50 border-amber-200';
    } else if (days > 0) {
        label = `還有 ${days} 天`;
        className = 'text-red-600 bg-red-50 border-red-200';
    } else if (days === 0) {
        label = '今日到期';
        className = 'text-red-600 bg-red-50 border-red-200';
    } else {
        return null;
    }

    return (
        <span className={`inline-block text-[9px] font-bold px-1 py-0.5 rounded border leading-none ${className}`}>
            {label}
        </span>
    );
}
