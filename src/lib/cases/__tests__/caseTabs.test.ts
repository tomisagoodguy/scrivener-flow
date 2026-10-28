/**
 * `/cases` 分頁顯示規則（spec: Handover fee tab on cases page）
 */
import { showsCaseList, showsMonitoringWidgets } from '../caseTabs';

describe('caseTabs', () => {
    it.each([
        ['Processing', true, true],
        ['All', true, true],
        ['Closed', true, false],
        ['Memo', false, false],
        ['Timeline', false, false],
        ['Pending', false, false],
        ['HandoverFee', false, false],
    ])('%s → 案件列表 %s、監控小卡 %s', (status, list, widgets) => {
        expect(showsCaseList(status)).toBe(list);
        expect(showsMonitoringWidgets(status)).toBe(widgets);
    });
});
