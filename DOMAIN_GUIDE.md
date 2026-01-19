# 🌐 網域註冊與 Vercel 串接指南 (Cloudflare 版)

本指南將協助您選擇適合的網域，並透過 Cloudflare 以成本價註冊，最後將其串接至 Vercel 部署的應用程式。

---

## 🚀 第一步：選擇網域名稱 (Naming Ideas)

好的網域應該簡短、好記且具備專業感。針對「不動產代書控案系統 (`scrivener-flow`)」，以下是幾個推薦方向：

### 1. 品牌導向 (首選)
直接使用專案名稱，最能建立品牌識別度。
- `scrivenerflow.com` (最權威，首選)
- `scrivener-flow.com` (若不帶連字號的被註冊了，這是很好的備案)
- `scrivener.tw` (針對台灣市場，強調在地化)

### 2. 功能導向
強調系統的功能，讓用戶一眼就知道用途。
- `casetracker.tw` (案件追蹤)
- `estateflow.app` (不動產流程 App)
- `landagent.pro` (專業代書)

### 3. 創意/好念
- `daishu.tech` (Daishu = 代書拼音，結合科技感)
- `daishu.flow`
- `case-master.com`

---

## 🛒 第二步：在 Cloudflare 購買網域

Cloudflare 提供 **成本價 (Wholesale Pricing)** 註冊，不賺差價且免費贈送隱私保護。

1. **登入/註冊**：前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) 並登入。
2. **進入註冊頁面**：
   - 左側選單點擊 **Domain Registration (網域註冊)**。
   - 選擇 **Register Domain (註冊網域)**。
3. **搜尋網域**：
   - 輸入您心儀的名字 (例如 `scrivenerflow`)。
   - 系統會顯示 `.com`, `.tw`, `.net` 等後綴的價格 (通常 .com 約 $9.77/年)。
4. **購買**：
   - 點擊 **Purchase**。
   - 填寫註冊人資訊 (需填英文地址，可以在中華郵政網站查詢翻譯)。
   - **注意**：即便填寫真實資訊，Cloudflare 會自動開啟 WHOIS Redaction (隱私保護)，外界查不到您的個資。
   - 完成付款。

---

## 🔗 第三步：將網域串接到 Vercel

### 1. Vercel 端設定
1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)。
2. 點擊您的專案 `my-case-tracker`。
3. 進入 **Settings (設定)** > **Domains (網域)**。
4. 在輸入框輸入您剛買的網域 (例如 `scrivenerflow.com`)，點擊 **Add**。
5. 接著也建議加入 `www.scrivenerflow.com`，並設定自動跳轉 (Redirect to main domain)。
6. Vercel 畫面會顯示一組 **A Record** IP (通常是 `76.76.21.21`) 和 **CNAME** 建議值，請保持這個頁面開啟。

### 2. Cloudflare 端設定 DNS
1. 回到 Cloudflare Dashboard，點擊您剛買的網域。
2. 左側選單選擇 **DNS** > **Records**。
3. 點擊 **Add record** 新增以下兩筆資料：

| Type (類型) | Name (名稱) | Content (內容/IP) | Proxy Status (代理狀態) | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | ☁️ **DNS Only** (灰色) | 指向 Vercel 伺服器 (根網域) |
| **CNAME** | `www` | `cname.vercel-dns.com` | ☁️ **DNS Only** (灰色) | www 子網域 |

> **重要**：一開始建議先把 Proxy Status 設為 **DNS Only (灰色雲)**。等到 Vercel 那邊顯示 ✅ Valid Configuration 且綠燈亮起後，再回來 Cloudflare 開啟橘色雲 (Proxied) 以獲得 CDN 加速與防護。

---

## 🔒 第四步：關鍵的 SSL 設定 (必做！)

由於 Vercel 本身會處理 SSL 憑證，當您開啟 Cloudflare 的橘色雲 (Proxied) 時，必須將加密模式設為 **Full (Strict)**，否則會發生「重新導向次數過多 (Too many redirects)」的錯誤。

1. 在 Cloudflare 左側選單選擇 **SSL/TLS**。
2. 進入 **Overview**。
3. 將加密模式 (Encryption Mode) 切換為 **Full (Strict)**。

---

## ✅ 完成檢核表

- [ ] 決定網域名稱並購買成功。
- [ ] Vercel 後台已新增網域。
- [ ] Cloudflare DNS 已設定 A Record 指向 Vercel IP。
- [ ] Vercel 網域狀態顯示綠燈 (可能需要幾分鐘生效)。
- [ ] (選用) 開啟 Cloudflare Proxy (橘色雲) 並將 SSL 設為 Full (Strict)。

恭喜！您的網站現在擁有專業的自訂網域了！🎉
