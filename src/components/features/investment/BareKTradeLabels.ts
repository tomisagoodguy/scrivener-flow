import type {
    IChartApiBase,
    IPrimitivePaneRenderer,
    IPrimitivePaneView,
    ISeriesApi,
    ISeriesPrimitive,
    PrimitivePaneViewZOrder,
    SeriesAttachedParameter,
    SeriesType,
    Time,
} from 'lightweight-charts';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { StrategyHoldingMarks } from '@/lib/investment/strategyTradeUtils';
import { toTime } from './BareKChartConfig';

// 台股紅漲綠跌：買＝rose-600、賣＝emerald-600
const BUY_COLOR = '#e11d48';
const SELL_COLOR = '#059669';
// 內建 marker 文字沿用整張圖 10px 字級，故自繪；以下皆為 CSS px
const FONT_PX = 12;
const PAD_X = 4;
const LABEL_HEIGHT = 16;
const RADIUS = 3;
const GAP_ABOVE = 6;
// 「賣」在 K 棒下方要讓出均線發散的 belowBar 箭頭
const GAP_BELOW = 18;
// 標籤半寬（12px 字＋左右內距約 20px，加 2px 餘裕）：此範圍內的 K 棒都要避開
const HALF_WIDTH = 12;

export interface TradeLabel {
    time: number;
    price: number;
    text: '買' | '賣';
    color: string;
    position: 'above' | 'below';
}

/**
 * 買進日「買」（最高價上方）、出場日「賣」（最低價下方）；只標實際 K 棒、同日同文字一次、依時間遞增。
 */
export function buildTradeLabels(ohlcv: BareKSnapshot['ohlcv'], marks: StrategyHoldingMarks): TradeLabel[] {
    const bars = new Map(ohlcv.filter(d => d.o !== null && d.c !== null).map(d => [d.date, d]));
    const build = (dates: readonly string[], text: TradeLabel['text']): TradeLabel[] =>
        [...new Set(dates)].flatMap((date): TradeLabel[] => {
            const b = bars.get(date);
            const price = text === '買' ? b?.h : b?.l;
            if (price === null || price === undefined) return [];
            return [{
                time: toTime(date),
                price,
                text,
                color: text === '買' ? BUY_COLOR : SELL_COLOR,
                position: text === '買' ? 'above' : 'below',
            }];
        });
    return [...build(marks.entryDates, '買'), ...build(marks.exitDates, '賣')].sort((a, b) => a.time - b.time);
}

/** K 棒在圖面上的像素座標（highY 較小＝畫面較上方） */
export interface BarCoord {
    x: number;
    highY: number;
    lowY: number;
}

/**
 * 標籤錨點：「買」取水平覆蓋範圍內最高的 K 棒頂、「賣」取最低的 K 棒底，標籤才不會壓到相鄰 K 棒；範圍內無 K 棒回 null。
 */
export function labelAnchorY(
    position: TradeLabel['position'],
    x: number,
    bars: readonly BarCoord[],
    halfWidth: number,
): number | null {
    const covered = bars.filter(b => Math.abs(b.x - x) <= halfWidth);
    if (covered.length === 0) return null;
    return position === 'above'
        ? Math.min(...covered.map(b => b.highY))
        : Math.max(...covered.map(b => b.lowY));
}

type DrawTarget = Parameters<IPrimitivePaneRenderer['draw']>[0];

interface LabelPoint {
    x: number;
    y: number;
    label: TradeLabel;
}

class TradeLabelsRenderer implements IPrimitivePaneRenderer {
    constructor(private readonly points: readonly LabelPoint[]) {}

    draw(target: DrawTarget): void {
        target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio: hr, verticalPixelRatio: vr }) => {
            ctx.font = `bold ${FONT_PX * vr}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const h = LABEL_HEIGHT * vr;
            for (const { x, y, label } of this.points) {
                // y 是錨點（覆蓋範圍內 K 棒的極值）
                const w = ctx.measureText(label.text).width + PAD_X * 2 * hr;
                // 貼近左右邊緣的 K 棒：標籤往內收，不被價格軸切掉
                const cx = Math.min(Math.max(x * hr, w / 2), bitmapSize.width - w / 2);
                const rawTop = label.position === 'above' ? (y - GAP_ABOVE) * vr - h : (y + GAP_BELOW) * vr;
                // 價格軸已預留上下邊距；此處只是最後保險，避免標籤畫出圖面
                const top = Math.min(Math.max(rawTop, 0), bitmapSize.height - h);
                ctx.fillStyle = label.color;
                ctx.beginPath();
                ctx.roundRect(cx - w / 2, top, w, h, RADIUS * hr);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label.text, cx, top + h / 2);
            }
        });
    }
}

class TradeLabelsPaneView implements IPrimitivePaneView {
    private points: LabelPoint[] = [];

    constructor(private readonly source: TradeLabelsPrimitive) {}

    update(): void {
        const { chart, series } = this.source;
        if (!chart || !series) {
            this.points = [];
            return;
        }
        const timeScale = chart.timeScale();
        const bars = series.data().flatMap((d): BarCoord[] => {
            if (!('high' in d) || !('low' in d)) return [];
            const x = timeScale.timeToCoordinate(d.time);
            const highY = series.priceToCoordinate(d.high);
            const lowY = series.priceToCoordinate(d.low);
            return x === null || highY === null || lowY === null ? [] : [{ x, highY, lowY }];
        });
        this.points = this.source.labels.flatMap((label): LabelPoint[] => {
            const x = timeScale.timeToCoordinate(label.time as unknown as Time);
            if (x === null) return [];
            const y = labelAnchorY(label.position, x, bars, HALF_WIDTH);
            return y === null ? [] : [{ x, y, label }];
        });
    }

    zOrder(): PrimitivePaneViewZOrder {
        return 'top';
    }

    renderer(): IPrimitivePaneRenderer {
        return new TradeLabelsRenderer(this.points);
    }
}

/** 掛在 K 線 series 上，自繪實心底白字的「買」「賣」標籤 */
export class TradeLabelsPrimitive implements ISeriesPrimitive<Time> {
    chart: IChartApiBase<Time> | null = null;
    series: ISeriesApi<SeriesType, Time> | null = null;
    private readonly view = new TradeLabelsPaneView(this);

    constructor(readonly labels: readonly TradeLabel[]) {}

    attached({ chart, series }: SeriesAttachedParameter<Time>): void {
        this.chart = chart;
        this.series = series;
    }

    detached(): void {
        this.chart = null;
        this.series = null;
    }

    updateAllViews(): void {
        this.view.update();
    }

    paneViews(): readonly IPrimitivePaneView[] {
        return [this.view];
    }
}
