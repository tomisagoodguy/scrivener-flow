/** `/cases` 分頁（`status` URL 參數）的顯示規則 */

/** 有專屬檢視、不顯示案件列表 table 的分頁 */
const DEDICATED_VIEW_TABS = new Set(['Memo', 'Timeline', 'Pending', 'HandoverFee']);

/** 是否顯示案件列表 table */
export function showsCaseList(status: string): boolean {
    return !DEDICATED_VIEW_TABS.has(status);
}

/** 是否顯示案件監控小卡（已結案與專屬檢視分頁都不顯示） */
export function showsMonitoringWidgets(status: string): boolean {
    return status !== 'Closed' && showsCaseList(status);
}
