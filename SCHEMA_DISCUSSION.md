代書案件管理系統 - 資料庫欄位規格書 (v1.0)

1. 核心案件資料 (Table: Cases)
   這是系統的主表，每一行代表一個案件。

1.1 識別與狀態 (Identity & Status)
id: UUID/Auto-increment (系統內部主鍵)

case_number (案件編號): String (唯一值，例如 "AA12345678")。

legacy_id (舊系統編號): String (選填，保留給 "召君3" 或 "物編" 使用)。

status (案件狀態): Enum

選項：Processing (辦理中)、Closed (結案)、Cancelled (解約)、Pending (暫緩/保留)。

註：細部進度（如用印中）建議由「關鍵日期」欄位是否填寫來自動判斷，不需人工手動切換狀態。

handler (承辦人): String (負責該案的代書或助理，對應 "子翔" 或 "團隊" 概念)。

1.2 關係人 (People)
buyer_name (買方姓名): String (為了搜尋方便，建議存姓名即可。若需紀錄多人，可用 / 分隔或另建關聯表)。

seller_name (賣方姓名): String。

agent_name (仲介/介紹人): String (選填，方便追蹤案源)。

1.3 物件屬性 (Property Info)
city (縣市): String (例如 "台北市")。

district (行政區): String (例如 "士林區")。

address (詳細地址): String (完整地址，建議新增。若暫無可填路名)。

property_type (物件類型): Enum

選項：Apartment (公寓)、Building (大樓)、Land (土地)、Parking (車位)。

build_type (建物制度): Enum (源自 "召君3" 與 "子翔" 的核心分類)

選項：New_System (新制)、Old_System (舊制/本戶)、Old_System_No_Household (舊制/無戶)。

1. 時程控管 (Table: Milestones)
   整合「五大里程碑」與「代書作業細節時間」。

2.1 五大里程碑 (The Big 5)
contract_date (簽約日): Date

seal_date (用印日): Date

tax_payment_date (完稅日): Date

transfer_date (過戶日): Date

handover_date (交屋日): Date

2.2 作業細節日期 (Operational Dates)
源自 "子翔備忘錄" 與 "召君3" 的實務細節

sign_diff_days (簽差天數): Integer (簽約日與實際作業日的落差，或用印緩衝期)。

redemption_date (代償日): Date (幫賣方還款的日子，關鍵！)。

tax_filing_date (申報日): Date (房地合一或增值稅申報日)。

1. 財務與稅費 (Table: Financials)
   補強原本缺漏的金額欄位，整合 "案件進度" 與 "子翔" 的需求。

3.1 交易金額
total_price (成交價格): Decimal/Int (單位：元)。

pre_collected_fee (預收規費): Decimal/Int ("子翔" 欄位，避免墊款過多)。

balance_payment (尾款/代償金額): Decimal/Int (交屋時需結算的金額)。

3.2 稅務設定
vat_type (增值稅類型): Enum

選項：General (一般)、Self_Use (自用)、Inheritance (繼承/不核課)。

tax_house_land (房地合一稅): Boolean (是否需申報)。

tax_repurchase (重購退稅): Boolean (是否需辦理)。

3.3 銀行貸款 (Loans)
為了簡化，先併入主表，若未來需多筆貸款再拆分

buyer_bank (買方銀行): String (連結到銀行通訊錄)。

buyer_loan_amount (買方核貸金額): Decimal/Int。

seller_bank (賣方銀行): String (需代償的銀行)。

seller_redemption_amount (賣方代償金額): Decimal/Int。

1. 業務邏輯與檢查 (Logics & Checks)
   將 Excel 中大量混雜的備註結構化。

4.1 特殊標記 (Boolean Flags)
用勾選框取代備註文字，解決 "召君3" 備註過長問題

is_back_rent (是否回租): Boolean

has_tenant (帶租約): Boolean

is_radiation_check (輻射檢測): Boolean

is_sea_sand_check (氯離子/海砂檢測): Boolean

4.2 法務審核 (Legal Checks - "子翔" 專用)
check_priority_purchase (優先購買權確認): Boolean

check_second_mortgage (二胎塗銷確認): Boolean

check_seal_certificate (印鑑證明確認): Boolean

4.3 備註系統
notes (主要備註): Text (保留給無法歸類的文字，如 "S代書費多收1500")。

pending_tasks (待辦事項): Text (源自 "案件進度" 的未完成欄位)。

bank_contact_notes (銀行聯絡備註): Text (專門記行員電話、分機)。

1. 建議新增的獨立資料表 (Reference Tables)
   為了讓資料更乾淨，建議將以下資料獨立出來，不要手打字串。

5.1 銀行通訊錄 (Table: BankContacts)
源自 "案件進度設計範本" 的 Sheet "銀行"

bank_name: 銀行名稱 (e.g. 華南銀行)

branch_name: 分行名稱 (e.g. 士林分行)

contact_person: 行員姓名

phone: 電話

email: Email

note: 備註 (e.g. "這家核貸慢")
