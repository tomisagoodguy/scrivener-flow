
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (typeof window !== 'undefined') {
    console.log('--- Client Side Environment Check ---');
    console.log('URL Length:', supabaseUrl.length);
    console.log('Key Length:', supabaseAnonKey.length);
    if (!supabaseUrl) console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing on client!');
    if (!supabaseAnonKey) console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing on client!');
}

if (!supabaseUrl) {
    console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set!');
} else {
    // console.log('Supabase Client Initialized with URL:', supabaseUrl.substring(0, 10) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
