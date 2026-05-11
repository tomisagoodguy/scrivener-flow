export function HighBadge({ is200d, is20d }: { is200d: boolean; is20d: boolean }) {
    if (is200d) return (
        <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500 text-white leading-none">
            200日
        </span>
    );
    if (is20d) return (
        <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-400 text-white leading-none">
            20日
        </span>
    );
    return null;
}
