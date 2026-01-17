'use server';

import { createClient } from '@/lib/supabase/server';
import { RealEstateGuideline, REAL_ESTATE_GUIDELINES } from '@/data/real_estate_guidelines';

export async function getGuidelines() {
    const supabase = await createClient();
    const { data: guidelines, error } = await supabase
        .from('guidelines')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching guidelines:', error);
        return [];
    }

    return guidelines;
}

export async function createGuideline(payload_in: Omit<RealEstateGuideline, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    const payload = {
        ...payload_in,
        created_by: user.id
    };

    const { data, error } = await supabase
        .from('guidelines')
        .insert(payload)
        .select()
        .single();

    if (error) {
        return { error: error.message };
    }

    return { success: true, data };
}

export async function seedGuidelines() {
    const supabase = await createClient();

    // Check if empty
    const { count } = await supabase.from('guidelines').select('*', { count: 'exact', head: true });
    if (count !== null && count > 0) {
        return { message: 'Guidelines already exist, skipping seed.' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Must be logged in to seed' };

    // Transform static data to DB format
    const seedData = REAL_ESTATE_GUIDELINES.map(g => ({
        ...g,
        created_by: user.id
    }));

    const { error } = await supabase.from('guidelines').insert(seedData);

    if (error) return { error: error.message };
    return { success: true };
}
