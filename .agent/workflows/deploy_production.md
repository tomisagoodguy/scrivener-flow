---
description: 執行安全且標準化的生產環境部署流程
---

這個工作流將引導您完成部署前的各項檢查與執行。

1. 驗證目前位於 `main` 分支。
2. 同步遠端最新代碼。
// turbo
3. 執行 `git pull origin main`
4. 執行所有單元測試確保品質。
// turbo
5. 執行 `yarn test`
6. 建立生產環境建置檔案 (Build Bundle)。
// turbo
7. 執行 `yarn build`
8. 檢查建置過程中是否有錯誤。
9. 部署前請求您的最終確認。
10. 執行部署指令。
11. 建立 Git Release Tag。
// turbo
12. 執行 `git tag -a v[version] -m "Production release [version]"`
13. 將 Tag 推送至遠端。
// turbo
14. 執行 `git push origin v[version]`

---
**安全特性：**
- 強制在部署前執行測試與建置。
- 透過手動確認防止誤操作。
- 使用 Git Tag 記錄版本以利回滾。
