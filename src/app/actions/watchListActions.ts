'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function removeFromWatchList(id: string): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登入' };

    const { error } = await supabase
        .from('watch_list')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { error: error.message };

    revalidatePath('/investment/bare-k');
    revalidatePath('/investment/watch-list');
    return {};
}
