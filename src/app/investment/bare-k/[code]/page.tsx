import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BareKScrollViewer } from '@/components/features/investment/BareKScrollViewer';
import type { StockSlide } from '@/components/features/investment/BareKScrollViewer';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

interface Props {
    params: Promise<{ code: string }>;
}

export default async function BareKDetailPage({ params }: Props) {
    const { code } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 取全部自選股（順序與列表一致）
    const { data: watchList } = await supabase
        .from('watch_list')
        .select('stock_id, name, strategies')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

    const list = watchList ?? [];

    // 批次撈所有快照
    const snapshots = await Promise.all(
        list.map(async (w) => {
            const { data } = await supabase
                .from('bare_k_snapshots')
                .select('stock_id, date, ohlcv, mas, signals, margin, revenue, inv_chips, summary')
                .eq('stock_id', w.stock_id)
                .order('date', { ascending: false })
                .limit(1);
            return { code: w.stock_id, snapshot: (data?.[0] as BareKSnapshot | undefined) ?? null };
        })
    );

    const snapshotMap = new Map(snapshots.map((s) => [s.code, s.snapshot]));

    const slides: StockSlide[] = list.map((w) => {
        const snapshot = snapshotMap.get(w.stock_id) ?? null;
        return {
            code: w.stock_id,
            name: w.name || snapshot?.summary?.name || '',
            strategies: w.strategies ?? [],
            snapshot,
        };
    });

    // 找目前 code 的 index，找不到預設 0
    const initialIndex = Math.max(0, slides.findIndex((s) => s.code === code));

    return <BareKScrollViewer slides={slides} initialIndex={initialIndex} />;
}
