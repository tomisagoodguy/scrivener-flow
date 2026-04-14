/**
 * Word 匯出 - 檔案工具
 * 處理檔名清理、日期字串與 HTML 清單轉換
 */

/**
 * 清理檔名：移除非法字元並限制長度
 */
export function sanitizeFilename(name: string): string {
    return name
        .replace(/[<>:"/\\|?*]/g, '_') // 移除 Windows 非法字元
        .replace(/\s+/g, '_') // 空格轉底線
        .substring(0, 100); // 限制長度
}

/**
 * 取得當前日期字串 (YYYY-MM-DD)
 */
export function getDateString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * 轉換待辦清單為勾選框符號
 * Tiptap TaskList 格式：<li data-checked="true">...</li>
 */
export function convertTaskLists(html: string): string {
    let result = html.replace(
        /<li data-checked="true">/g,
        '<li style="list-style: none;">☑ '
    );
    result = result.replace(
        /<li data-checked="false">/g,
        '<li style="list-style: none;">☐ '
    );
    return result;
}
