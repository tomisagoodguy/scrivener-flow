-- upsert-skip-unchanged-rows 任務 5.2：驗證 IS DISTINCT FROM 守門在真實 DB 的行為
--
-- 做法：對 stock_broker_transactions 最新一列執行兩次守門 upsert，最後以 RAISE EXCEPTION
-- 帶出兩次影響列數。例外會讓整個 DO 區塊自動回滾 → 不會留下任何資料變更。
--
-- 執行：Supabase SQL Editor 貼上整份執行。結果會顯示為「錯誤」，這是預期行為，
-- 訊息應為：guard check: same_values=0 changed_value=1
--   same_values=0   → 原值重寫時守門擋下，不產生更新
--   changed_value=1 → net_volume 改變時照常更新

DO $$
DECLARE
    same_values   int;
    changed_value int;
BEGIN
    WITH src AS (
        SELECT stock_code, data_date, buy_amount, sell_amount, net_volume, force_metric
        FROM stock_broker_transactions
        ORDER BY data_date DESC, stock_code
        LIMIT 1
    ), r AS (
        INSERT INTO stock_broker_transactions
            (stock_code, data_date, buy_amount, sell_amount, net_volume, force_metric)
        SELECT stock_code, data_date, buy_amount, sell_amount, net_volume, force_metric FROM src
        ON CONFLICT (stock_code, data_date)
        DO UPDATE SET buy_amount = EXCLUDED.buy_amount, sell_amount = EXCLUDED.sell_amount,
                      net_volume = EXCLUDED.net_volume, force_metric = EXCLUDED.force_metric,
                      created_at = NOW()
        WHERE (stock_broker_transactions.buy_amount, stock_broker_transactions.sell_amount,
               stock_broker_transactions.net_volume, stock_broker_transactions.force_metric)
              IS DISTINCT FROM
              (EXCLUDED.buy_amount, EXCLUDED.sell_amount, EXCLUDED.net_volume, EXCLUDED.force_metric)
        RETURNING 1
    )
    SELECT count(*) INTO same_values FROM r;

    WITH src AS (
        SELECT stock_code, data_date, buy_amount, sell_amount, net_volume, force_metric
        FROM stock_broker_transactions
        ORDER BY data_date DESC, stock_code
        LIMIT 1
    ), r AS (
        INSERT INTO stock_broker_transactions
            (stock_code, data_date, buy_amount, sell_amount, net_volume, force_metric)
        SELECT stock_code, data_date, buy_amount, sell_amount, COALESCE(net_volume, 0) + 1, force_metric
        FROM src
        ON CONFLICT (stock_code, data_date)
        DO UPDATE SET buy_amount = EXCLUDED.buy_amount, sell_amount = EXCLUDED.sell_amount,
                      net_volume = EXCLUDED.net_volume, force_metric = EXCLUDED.force_metric,
                      created_at = NOW()
        WHERE (stock_broker_transactions.buy_amount, stock_broker_transactions.sell_amount,
               stock_broker_transactions.net_volume, stock_broker_transactions.force_metric)
              IS DISTINCT FROM
              (EXCLUDED.buy_amount, EXCLUDED.sell_amount, EXCLUDED.net_volume, EXCLUDED.force_metric)
        RETURNING 1
    )
    SELECT count(*) INTO changed_value FROM r;

    RAISE EXCEPTION 'guard check: same_values=% changed_value=%', same_values, changed_value;
END $$;
