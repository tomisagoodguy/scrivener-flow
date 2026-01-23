# Capability: Multimedia Attachments

## MODIFIED Requirements

### 檔案上傳與儲存 (Storage)

- 系統必須支援將圖片與附件上傳至 Google Drive 指定資料夾。
- 上傳過程必須具備進度反饋。

#### Scenario: 使用者在筆記內拖入圖片

- **Given**: 使用者已打開知識庫編輯器且已登錄 Google 帳戶。
- **When**: 使用者拖入一張 PNG 圖片。
- **Then**: 系統自動調用 `uploadToDrive`，圖片顯示上傳進度，上傳完成後圖片正確嵌入編輯器。

### 圖片預覽與顯示 (Rendering)

- 系統必須能正確渲染來自 Google Drive 的圖片連結，確保圖片對當前使用者可見。

#### Scenario: 讀取含有圖片的筆記

- **Given**: 筆記內含有指向 Google Drive 圖片 ID 的連結。
- **When**: 使用者打開該筆記。
- **Then**: 系統透過 Proxy 或 Direct Link 正確顯示圖片，不顯示碎圖。

### 多媒體速記 (Rich Dashboard Notes)

- 儀表板速記模組必須支援非純文字內容與附件列表。

#### Scenario: 在儀表板速記中增加附件

- **Given**: 使用者在儀表板「速記」模組撰寫備註。
- **When**: 使用者點擊「附加檔案」並選擇一份 PDF 合約草稿。
- **Then**: 該檔案被上傳至雲端，且在速記卡片下方顯示一個檔案跳轉連結。
