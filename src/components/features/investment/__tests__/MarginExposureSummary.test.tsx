/**
 * 高融資曝險摘要（change: margin-usage-percentile-risk）。
 * 涵蓋 spec：High margin exposure summary。
 */
import { render } from '@testing-library/react';
import { MarginExposureSummary } from '@/components/features/investment/MarginExposureSummary';

describe('MarginExposureSummary', () => {
    it('ETF holdings summary with weight (spec: 6 檔、9.4%)', () => {
        const { container } = render(
            <MarginExposureSummary
                summary={{ total: 50, highCount: 6, highWeight: 9.4, unknownCount: 0 }}
                showWeight
            />
        );
        expect(container.textContent).toBe('高融資前 20%：6 檔（權重 9.4%）');
    });

    it('watch list with missing data (spec: 3 檔、另 4 檔無資料)', () => {
        const { container } = render(
            <MarginExposureSummary
                summary={{ total: 12, highCount: 3, highWeight: 0, unknownCount: 4 }}
                showWeight={false}
            />
        );
        expect(container.textContent).toBe('高融資前 20%：3 檔另 4 檔無資料');
    });

    it('zero high-margin holdings', () => {
        const { container } = render(
            <MarginExposureSummary
                summary={{ total: 10, highCount: 0, highWeight: 0, unknownCount: 0 }}
                showWeight={false}
            />
        );
        expect(container.textContent).toBe('高融資前 20%：0 檔');
    });
});
