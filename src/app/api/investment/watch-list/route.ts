import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/investment/watch-list
 * 回傳目前使用者的自選股清單
 */
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('watch_list')
            .select('id, stock_id, name, strategies, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data ?? []);
    } catch (error) {
        console.error('[GET /api/investment/watch-list]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
