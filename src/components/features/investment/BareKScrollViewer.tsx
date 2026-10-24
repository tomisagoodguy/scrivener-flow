'use client';

import { BareKSlideContent } from './BareKSlideContent';
import { ScrollChartViewer } from './ScrollChartViewer';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

export interface StockSlide {
    code: string;
    name: string;
    strategies: string[];
    snapshot: BareKSnapshot | null;
}

interface Props {
    slides: StockSlide[];
    initialIndex: number;
    isOwner?: boolean;
    backHref?: string;
    noSnapshotMessage?: string;
    disableHistoryUpdate?: boolean;
}

/** 裸K看盤的連續捲動檢視：每格為裸K六面板圖，捲動時（預設）同步網址到 /investment/bare-k/<code>。 */
export function BareKScrollViewer({ slides, initialIndex, isOwner = false, backHref = '/investment/bare-k', noSnapshotMessage, disableHistoryUpdate = false }: Props) {
    return (
        <ScrollChartViewer
            slides={slides}
            initialIndex={initialIndex}
            backHref={backHref}
            onActiveChange={
                disableHistoryUpdate
                    ? undefined
                    : (slide) => history.replaceState(null, '', `/investment/bare-k/${slide.code}`)
            }
            renderSlide={(slide) => (
                <BareKSlideContent
                    code={slide.code}
                    name={slide.name}
                    strategies={slide.strategies}
                    snapshot={slide.snapshot}
                    isOwner={isOwner}
                    noSnapshotMessage={noSnapshotMessage}
                />
            )}
        />
    );
}
