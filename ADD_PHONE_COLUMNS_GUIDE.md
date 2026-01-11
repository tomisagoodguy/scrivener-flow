# 添加 buyer_phone 和 seller_phone 欄位指南

## 🔍 當前狀態
❌ 欄位尚未添加（檢查時間：剛剛）

## 📋 執行步驟

### 方法 1：在 Supabase Dashboard 執行 SQL（推薦）

1. **打開 Supabase Dashboard**
   - 訪問：https://app.supabase.com
   - 登入您的帳號

2. **選擇專案**
   - 專案 ID: `zvomerdcsxvuymnpuvxk`
   - 或選擇對應的專案

3. **進入 SQL Editor**
   - 點擊左側選單的 **SQL Editor**
   - 或直接訪問：https://app.supabase.com/project/zvomerdcsxvuymnpuvxk/sql

4. **執行 SQL**
   點擊 **New Query** 或使用現有的查詢編輯器，貼上以下 SQL：

   ```sql
   ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
   ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;
   ```

5. **執行查詢**
   - 點擊 **Run** 按鈕（或按 `Ctrl+Enter`）
   - 等待執行完成

6. **確認執行結果**
   - 應該看到 "Success. No rows returned" 或類似的成功訊息
   - 如果有錯誤，請檢查錯誤訊息

### 方法 2：使用 Table Editor 檢查

1. 前往 **Table Editor**
2. 選擇 **cases** 表
3. 點擊表頭的 **⋮** (三個點) 選單
4. 選擇 **Add Column**
5. 添加 `buyer_phone` (類型: TEXT)
6. 重複添加 `seller_phone` (類型: TEXT)

## ✅ 驗證是否成功

執行以下檢查腳本來驗證：

```bash
cd my-case-tracker
node check_columns.js
```

如果看到 "✅ 成功！buyer_phone 和 seller_phone 欄位已存在"，表示已成功添加。

## 🔄 如果仍然失敗

### 可能的原因：

1. **權限問題**
   - 確保您有足夠的權限修改資料庫結構
   - 可能需要使用 Service Role Key

2. **連接錯誤的資料庫**
   - 確認您選擇的是正確的專案

3. **Schema Cache 未更新**
   - Supabase 的 schema cache 可能需要時間更新
   - 嘗試等待幾秒後再檢查

4. **表名錯誤**
   - 確認表名是 `cases`（小寫）
   - 可以在 SQL Editor 執行 `SELECT * FROM cases LIMIT 1;` 來確認表存在

## 📝 完整 SQL（包含驗證）

```sql
-- 添加欄位
ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;

-- 驗證欄位是否存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
  AND column_name IN ('buyer_phone', 'seller_phone');
```

如果查詢返回 2 行（buyer_phone 和 seller_phone），表示欄位已成功添加。

## 🆘 需要幫助？

如果仍有問題，請：
1. 檢查 Supabase Dashboard 中的錯誤訊息
2. 截圖 SQL Editor 的執行結果
3. 確認您使用的是正確的專案
