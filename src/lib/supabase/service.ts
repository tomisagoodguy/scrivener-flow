/**
 * Supabase service client（無 cookie 依賴）
 * 專用於 Server Actions / unstable_cache 內部
 * 使用 anon key（公開資料表不需要 service role key）
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function getServiceClient() {
  if (!_client) {
    _client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
      }
    );
  }
  return _client;
}

// 無型別限制的 anon client，用於 unstable_cache 內查詢 ETF / 市場資料表
let _publicClient: ReturnType<typeof createClient> | null = null;

export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _publicClient;
}

let _adminClient: ReturnType<typeof createClient<Database>> | null = null;

// bypass RLS，僅限 Server 端使用
export function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _adminClient;
}
