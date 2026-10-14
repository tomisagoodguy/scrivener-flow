import { act, render, screen, fireEvent } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import ExcelStep from '@/components/shared/ExcelStep';

describe('ExcelStep highlight persistence', () => {
    beforeEach(() => localStorage.clear());

    it('restores a saved highlight on mount (simulates reopening the tab)', () => {
        localStorage.setItem('highlight_c1_印', 'true');
        render(<ExcelStep label="印" caseId="c1" />);
        expect(screen.getByText('印').parentElement?.className).toMatch(/bg-amber-200/);
    });

    it('toggles and persists to localStorage', () => {
        render(<ExcelStep label="稅" caseId="c1" />);
        const cell = screen.getByText('稅').parentElement!;
        act(() => {
            fireEvent.click(cell);
        });
        expect(localStorage.getItem('highlight_c1_稅')).toBe('true');
        expect(cell.className).toMatch(/bg-amber-200/);
        act(() => {
            fireEvent.click(cell);
        });
        expect(localStorage.getItem('highlight_c1_稅')).toBe('false');
        expect(cell.className).not.toMatch(/bg-amber-200/);
    });

    it('server render is unhighlighted so hydration does not mismatch', () => {
        localStorage.setItem('highlight_c1_交', 'true');
        const html = renderToString(<ExcelStep label="交" caseId="c1" />);
        expect(html).not.toMatch(/bg-amber-200/);
    });
});
