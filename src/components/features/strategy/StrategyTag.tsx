/** 換股後表現面板「全部」模式下標示所屬策略的小標籤 */
export default function StrategyTag({ label }: { label: string }) {
    return (
        <span className="ml-1 rounded bg-gray-100/80 dark:bg-gray-700/60 px-1 text-[10px] text-gray-500 dark:text-gray-300">
            {label}
        </span>
    );
}
