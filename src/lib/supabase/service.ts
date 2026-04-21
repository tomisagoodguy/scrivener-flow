/**
 * Supabase service client（無 cookie 依賴）
 * 專用於 Server Actions / unstable_cache 內部
 * 使用 anon key（公開資料表不需要 service role key）
 */
import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

export function getServiceClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
      }
    );
  }
  return _client;
}

let _adminClient: ReturnType<typeof createClient> | null = null;

// bypass RLS，僅限 Server 端使用
export function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _adminClient;
}
