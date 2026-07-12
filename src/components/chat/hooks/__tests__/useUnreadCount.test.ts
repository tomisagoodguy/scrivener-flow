/**
 * TDD：實作前先寫測試。對應 spec 需求「Conversation list shows unread counts」
 * 第一個 Scenario「New message increases unread count for other members」。
 * computeUnreadCount 為純函式：依 last_read_at 與訊息時間戳比較計算未讀數，
 * 不依賴 Supabase 連線。
 */

import { computeUnreadCount, sumUnreadCounts } from '@/components/chat/hooks/useUnreadCount';

describe('computeUnreadCount', () => {
    it('新訊息時間晚於 last_read_at 時計入未讀', () => {
        const count = computeUnreadCount('2026-07-01T00:00:00Z', [
            { created_at: '2026-07-01T00:00:01Z' },
            { created_at: '2026-07-01T00:00:02Z' },
        ]);
        expect(count).toBe(2);
    });

    it('訊息時間早於或等於 last_read_at 時不計入未讀', () => {
        const count = computeUnreadCount('2026-07-01T00:00:02Z', [
            { created_at: '2026-07-01T00:00:00Z' },
            { created_at: '2026-07-01T00:00:01Z' },
            { created_at: '2026-07-01T00:00:02Z' },
        ]);
        expect(count).toBe(0);
    });

    it('沒有任何訊息時未讀數為 0', () => {
        expect(computeUnreadCount('2026-07-01T00:00:00Z', [])).toBe(0);
    });
});

describe('sumUnreadCounts', () => {
    it('加總所有對話的未讀數作為側邊欄總未讀數', () => {
        const total = sumUnreadCounts({ conv_1: 2, conv_2: 0, conv_3: 5 });
        expect(total).toBe(7);
    });

    it('沒有任何對話時總未讀數為 0', () => {
        expect(sumUnreadCounts({})).toBe(0);
    });
});
