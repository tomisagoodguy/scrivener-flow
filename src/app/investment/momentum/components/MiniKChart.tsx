import type { MomentumCandle } from '@/app/actions/getWindowMomentum';

/**
 * 窗口內日 K + 成交量 mini chart（純 SVG Server Component）。
 * 台股慣例：收漲 rose、收跌 emerald。
 */

interface Props {
    candles: MomentumCandle[];
}

const W = 200;
const K_H = 64;
const VOL_H = 28;
const GAP = 6;
const H = K_H + GAP + VOL_H;

function candleClass(c: MomentumCandle): string {
    if (c.close > c.open) return 'fill-rose-500';
    if (c.close < c.open) return 'fill-emerald-500';
    return 'fill-slate-400';
}

function wickClass(c: MomentumCandle): string {
    if (c.close > c.open) return 'stroke-rose-500';
    if (c.close < c.open) return 'stroke-emerald-500';
    return 'stroke-slate-400';
}

export function MiniKChart({ candles }: Props) {
    if (candles.length === 0) {
        return (
            <div className="flex items-center justify-center h-24 text-xs text-slate-400">
                無價格資料
            </div>
        );
    }

    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const priceRange = max - min || 1;
    const maxVolume = Math.max(...candles.map((c) => c.volume), 1);

    const slot = W / candles.length;
    const bodyWidth = Math.min(slot * 0.55, 18);

    const priceY = (p: number) => K_H - ((p - min) / priceRange) * (K_H - 4) - 2;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label={`近 ${candles.length} 日 K 線與成交量`}
        >
            {candles.map((c, i) => {
                const cx = slot * i + slot / 2;
                const bodyTop = priceY(Math.max(c.open, c.close));
                const bodyBottom = priceY(Math.min(c.open, c.close));
                const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
                const volHeight = Math.max((c.volume / maxVolume) * (VOL_H - 2), 1);

                return (
                    <g key={c.date}>
                        {/* 上下影線 */}
                        <line
                            x1={cx}
                            y1={priceY(c.high)}
                            x2={cx}
                            y2={priceY(c.low)}
                            strokeWidth={1}
                            className={wickClass(c)}
                        />
                        {/* 實體 */}
                        <rect
                            x={cx - bodyWidth / 2}
                            y={bodyTop}
                            width={bodyWidth}
                            height={bodyHeight}
                            rx={1}
                            className={candleClass(c)}
                        />
                        {/* 成交量柱 */}
                        <rect
                            x={cx - bodyWidth / 2}
                            y={K_H + GAP + (VOL_H - volHeight)}
                            width={bodyWidth}
                            height={volHeight}
                            rx={1}
                            className={`${candleClass(c)} opacity-60`}
                        />
                    </g>
                );
            })}
        </svg>
    );
}
