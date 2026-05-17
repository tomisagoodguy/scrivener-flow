interface DataPoint {
    month: string;
    ic_20d: number | null;
}

interface Props {
    data: DataPoint[];
}

const W = 120;
const H = 40;
const PAD = 4;

export default function FactorICSparkline({ data }: Props) {
    const valid = data.filter((d) => d.ic_20d !== null) as (DataPoint & { ic_20d: number })[];
    if (valid.length < 3) return null;

    const values = valid.map((d) => d.ic_20d);
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 0);
    const range = maxV - minV || 0.001;

    const toX = (i: number) => PAD + (i / (valid.length - 1)) * (W - PAD * 2);
    const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);
    const zeroY = toY(0);

    const positivePoints: string[] = [];
    const negativePoints: string[] = [];

    for (let i = 0; i < valid.length; i++) {
        const x = toX(i);
        const y = toY(valid[i].ic_20d);
        const pt = `${x},${y}`;
        positivePoints.push(pt);
        negativePoints.push(pt);
    }

    const posPath = `M ${positivePoints.join(' L ')}`;
    const negPath = `M ${negativePoints.join(' L ')}`;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            aria-hidden="true"
            className="overflow-visible"
        >
            {/* y=0 基準線 */}
            <line
                x1={PAD}
                y1={zeroY}
                x2={W - PAD}
                y2={zeroY}
                stroke="#9ca3af"
                strokeWidth={0.5}
                strokeDasharray="2,2"
            />

            {/* 負值折線（rose） */}
            <path
                d={negPath}
                fill="none"
                stroke="#e11d48"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath="url(#neg-clip)"
            />
            {/* 正值折線（emerald） */}
            <path
                d={posPath}
                fill="none"
                stroke="#059669"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath="url(#pos-clip)"
            />

            <defs>
                {/* 只顯示 y=0 以上的正值區段 */}
                <clipPath id="pos-clip">
                    <rect x={0} y={0} width={W} height={zeroY} />
                </clipPath>
                {/* 只顯示 y=0 以下的負值區段 */}
                <clipPath id="neg-clip">
                    <rect x={0} y={zeroY} width={W} height={H - zeroY} />
                </clipPath>
            </defs>
        </svg>
    );
}
