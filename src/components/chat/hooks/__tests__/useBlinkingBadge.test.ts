/**
 * 對應 design.md Implementation Contract 的 5 個 acceptance criteria 情境，
 * 以及 spec.md「Displayed count persists after read」「Blinking resumes on new
 * unread message after read」等需求：已讀後數字凍結不變、停止閃爍，
 * 有新未讀訊息時恢復閃爍並更新數字。
 */

import { renderHook } from '@testing-library/react';
import { useBlinkingBadge } from '@/components/chat/hooks/useBlinkingBadge';

describe('useBlinkingBadge', () => {
    it('初始 unread 為 0 時不顯示、不閃爍', () => {
        const { result } = renderHook(() => useBlinkingBadge(0));
        expect(result.current.displayCount).toBe(0);
        expect(result.current.isBlinking).toBe(false);
    });

    it('unread 從 0 變為 3 時顯示 3 並開始閃爍', () => {
        const { result, rerender } = renderHook(({ unread }) => useBlinkingBadge(unread), {
            initialProps: { unread: 0 },
        });

        rerender({ unread: 3 });

        expect(result.current.displayCount).toBe(3);
        expect(result.current.isBlinking).toBe(true);
    });

    it('已讀後（unread 變回 0）數字維持凍結、停止閃爍', () => {
        const { result, rerender } = renderHook(({ unread }) => useBlinkingBadge(unread), {
            initialProps: { unread: 0 },
        });

        rerender({ unread: 3 });
        rerender({ unread: 0 });

        expect(result.current.displayCount).toBe(3);
        expect(result.current.isBlinking).toBe(false);
    });

    it('已讀凍結後再收到新未讀訊息，數字更新並恢復閃爍', () => {
        const { result, rerender } = renderHook(({ unread }) => useBlinkingBadge(unread), {
            initialProps: { unread: 0 },
        });

        rerender({ unread: 3 });
        rerender({ unread: 0 });
        rerender({ unread: 2 });

        expect(result.current.displayCount).toBe(2);
        expect(result.current.isBlinking).toBe(true);
    });

    it('unread 連續遞增未曾歸零時，數字同步更新且持續閃爍', () => {
        const { result, rerender } = renderHook(({ unread }) => useBlinkingBadge(unread), {
            initialProps: { unread: 3 },
        });

        expect(result.current.displayCount).toBe(3);
        expect(result.current.isBlinking).toBe(true);

        rerender({ unread: 5 });

        expect(result.current.displayCount).toBe(5);
        expect(result.current.isBlinking).toBe(true);
    });

    it('已讀凍結後新未讀數字恰好等於凍結值時，仍視為新未讀並恢復閃爍', () => {
        const { result, rerender } = renderHook(({ unread }) => useBlinkingBadge(unread), {
            initialProps: { unread: 0 },
        });

        rerender({ unread: 3 });
        rerender({ unread: 0 });
        rerender({ unread: 3 });

        expect(result.current.displayCount).toBe(3);
        expect(result.current.isBlinking).toBe(true);
    });
});
