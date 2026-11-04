import type { LedgerEntry } from '@/domain/handover-fee/types';

export type EntryType = LedgerEntry['entry_type'];

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
    { value: 'exchange', label: '互遞' },
    { value: 'solo', label: '自己遞牌' },
];

/** 新增表單的紀錄類型切換 */
export function EntryTypeSwitch({ value, onChange }: { value: EntryType; onChange: (type: EntryType) => void }) {
    return (
        <div role="group" aria-label="紀錄類型" className="flex gap-2">
            {ENTRY_TYPES.map((type) => (
                <button
                    key={type.value}
                    type="button"
                    aria-pressed={value === type.value}
                    onClick={() => onChange(type.value)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black transition-colors ${
                        value === type.value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600'
                    }`}
                >
                    {type.label}
                </button>
            ))}
        </div>
    );
}
