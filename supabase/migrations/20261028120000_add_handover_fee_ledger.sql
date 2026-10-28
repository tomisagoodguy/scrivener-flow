-- 遞牌費紀錄：地政士名單 scriveners + 遞牌費 handover_fees + 預設名單 RPC
-- 對應 openspec/changes/handover-fee-ledger/design.md

-- 1. scriveners（地政士名單，每位使用者各自一份）
CREATE TABLE IF NOT EXISTS scriveners (
    id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    archived_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),

    -- 不論是否隱藏都唯一：新增已隱藏的同名者走「還原」而非重複建立
    CONSTRAINT scriveners_user_name_unique UNIQUE (user_id, name),
    -- 供 handover_fees 複合外鍵使用，防止引用他人名單
    CONSTRAINT scriveners_id_user_unique UNIQUE (id, user_id),
    CONSTRAINT scriveners_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- 2. handover_fees（遞牌費紀錄）
CREATE TABLE IF NOT EXISTS handover_fees (
    id                 uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fee_date           date NOT NULL,
    object_number      text NOT NULL,
    payer_scrivener_id uuid NOT NULL,
    payee_scrivener_id uuid NOT NULL,
    amount             integer NOT NULL,
    paid_at            timestamptz,
    note               text,
    deleted_at         timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT handover_fees_payer_fk FOREIGN KEY (payer_scrivener_id, user_id)
        REFERENCES scriveners(id, user_id),
    CONSTRAINT handover_fees_payee_fk FOREIGN KEY (payee_scrivener_id, user_id)
        REFERENCES scriveners(id, user_id),
    CONSTRAINT handover_fees_distinct_parties CHECK (payer_scrivener_id <> payee_scrivener_id),
    CONSTRAINT handover_fees_amount_positive CHECK (amount > 0),
    CONSTRAINT handover_fees_object_number_not_blank CHECK (length(btrim(object_number)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_handover_fees_user_date ON handover_fees(user_id, fee_date);
CREATE INDEX IF NOT EXISTS idx_handover_fees_unpaid ON handover_fees(user_id, fee_date)
    WHERE paid_at IS NULL AND deleted_at IS NULL;

-- 3. RLS：僅本人可存取
ALTER TABLE scriveners ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scriveners_select_own" ON scriveners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "scriveners_insert_own" ON scriveners FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "scriveners_update_own" ON scriveners FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "scriveners_delete_own" ON scriveners FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "handover_fees_select_own" ON handover_fees FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "handover_fees_insert_own" ON handover_fees FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "handover_fees_update_own" ON handover_fees FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "handover_fees_delete_own" ON handover_fees FOR DELETE USING (user_id = auth.uid());

-- 4. 首次使用時建立預設名單（使用者一筆都沒有時才建，含已隱藏者；只建一次）
CREATE OR REPLACE FUNCTION ensure_default_scriveners()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF EXISTS (SELECT 1 FROM scriveners WHERE user_id = auth.uid()) THEN
        RETURN;
    END IF;

    INSERT INTO scriveners (user_id, name, sort_order)
    SELECT auth.uid(), d.name, (d.ord - 1)::integer
    FROM unnest(ARRAY['孔協', '家華', '定康', '文慶', '瑞麟', '來慶', '順鵬']) WITH ORDINALITY AS d(name, ord)
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_default_scriveners() TO authenticated;
