import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
    console.error('CRITICAL: Supabase keys missing on client!');
}

// Singleton-like export for client-side usage matching existing import usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
