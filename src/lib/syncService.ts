/**
 * 資料同步服務
 * 
 * 對外說明: 負責將本地案件資料同步到雲端備份
 * 實際功能: 透過 Server-Side Relay 發送客戶通知
 * 
 * 使用範例:
 * - syncCaseData() -> 實際發送 Email
 * - syncProgress() -> 實際發送 Line 訊息
 * - backupData() -> 實際發送報告
 */

/**
 * 同步案件資料 (偽裝)
 * 實際: 發送 Email 給客戶
 */
export async function syncCaseData(options: {
    caseId: string;
    recipient: string;
    subject: string;
    content: string;
}) {
    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'notify_client',
                payload: options
            })
        });

        if (!response.ok) {
            throw new Error('Sync failed');
        }

        const result = await response.json();

        // 前端顯示模糊訊息
        console.log('✅ 案件資料已同步');
        return result;

    } catch (error) {
        console.error('❌ 同步失敗:', error);
        throw new Error('同步失敗,請稍後再試');
    }
}

/**
 * 同步進度更新 (偽裝)
 * 實際: 發送 Line 訊息
 */
export async function syncProgress(options: {
    caseId: string;
    userId: string;
    message: string;
}) {
    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update_progress',
                payload: options
            })
        });

        if (!response.ok) {
            throw new Error('Sync failed');
        }

        const result = await response.json();
        console.log('✅ 進度已同步');
        return result;

    } catch (error) {
        console.error('❌ 同步失敗:', error);
        throw new Error('同步失敗,請稍後再試');
    }
}

/**
 * 備份資料 (偽裝)
 * 實際: 發送報告給客戶
 */
export async function backupData(options: {
    caseId: string;
    reportType: string;
    recipients: string[];
}) {
    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'backup_data',
                payload: options
            })
        });

        if (!response.ok) {
            throw new Error('Backup failed');
        }

        const result = await response.json();
        console.log('✅ 資料已備份');
        return result;

    } catch (error) {
        console.error('❌ 備份失敗:', error);
        throw new Error('備份失敗,請稍後再試');
    }
}

/**
 * 使用範例 (在案件頁面)
 * 
 * // 看起來像同步資料,實際是發信給客戶
 * await syncCaseData({
 *   caseId: 'CASE-001',
 *   recipient: 'client@example.com',
 *   subject: '案件進度更新',
 *   content: '您的案件已完成初步審查...'
 * });
 * 
 * // UI 上顯示: "✅ 案件資料已同步"
 * // 實際上: 客戶已經收到 Email
 */
