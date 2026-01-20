/**
 * 加密金鑰管理資料表
 * 
 * 用途：
 * - 儲存歷史金鑰版本 (支援解密舊資料)
 * - 追蹤金鑰輪換歷史
 * - 自動過期管理
 */

-- 建立 encryption_keys 資料表
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 建立唯一索引 (確保同時只有一個啟用的金鑰)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_key ON encryption_keys (is_active) WHERE is_active = true;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_id ON encryption_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at DESC);

-- RLS 政策 (僅允許服務角色存取)
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage encryption keys"
  ON encryption_keys
  FOR ALL
  USING (auth.role() = 'service_role');

-- 自動清理過期金鑰 (保留最近 3 個版本)
CREATE OR REPLACE FUNCTION cleanup_old_encryption_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM encryption_keys
  WHERE id NOT IN (
    SELECT id
    FROM encryption_keys
    ORDER BY created_at DESC
    LIMIT 3
  );
END;
$$;

-- 註解說明
COMMENT ON TABLE encryption_keys IS '加密金鑰管理資料表，支援金鑰輪換與版本控制';
COMMENT ON COLUMN encryption_keys.key_id IS '金鑰識別碼 (UUID)';
COMMENT ON COLUMN encryption_keys.key_value IS '實際金鑰值 (hex 編碼)';
COMMENT ON COLUMN encryption_keys.is_active IS '是否為當前啟用金鑰 (全域唯一)';
COMMENT ON COLUMN encryption_keys.expires_at IS '金鑰過期時間';
