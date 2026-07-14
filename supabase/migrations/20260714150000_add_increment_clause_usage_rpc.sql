-- Fix: contract_clauses 排序依賴 usage_count，但複製時呼叫的 RPC 從未建立，
-- 導致 usage_count 永遠不會增加，常用條文無法自動排到前面。

CREATE OR REPLACE FUNCTION increment_clause_usage(row_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE contract_clauses
    SET usage_count = usage_count + 1
    WHERE id = row_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_clause_usage(UUID) TO authenticated;
