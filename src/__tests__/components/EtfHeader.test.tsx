import React from 'react';
import { render, screen } from '@testing-library/react';
import { EtfHeader } from '@/components/features/investment/EtfHeader';

describe('EtfHeader', () => {
    describe('data source badge', () => {
        it('shows Pocket.tw badge for pocket source', () => {
            render(<EtfHeader dataDate="2026-05-13" dataSource="pocket" />);
            expect(screen.getByText('Pocket.tw')).toBeInTheDocument();
        });

        it('shows official badge for official_api source', () => {
            render(<EtfHeader dataDate="2026-05-13" dataSource="official_api" />);
            expect(screen.getByText('官方 API')).toBeInTheDocument();
        });
    });

    describe('staleness color rules', () => {
        const baseDate = new Date('2026-05-13');

        function renderWithDate(dataDate: string) {
            return render(<EtfHeader dataDate={dataDate} dataSource="pocket" today={baseDate} />);
        }

        it('applies neutral style when data is fresh (0 days old)', () => {
            const { container } = renderWithDate('2026-05-13');
            const badge = container.querySelector('[data-staleness]');
            expect(badge?.getAttribute('data-staleness')).toBe('fresh');
        });

        it('applies neutral style when data is 2 days old', () => {
            const { container } = renderWithDate('2026-05-11');
            const badge = container.querySelector('[data-staleness]');
            expect(badge?.getAttribute('data-staleness')).toBe('fresh');
        });

        it('applies warning style when data is 3 days old', () => {
            const { container } = renderWithDate('2026-05-10');
            const badge = container.querySelector('[data-staleness]');
            expect(badge?.getAttribute('data-staleness')).toBe('warning');
        });

        it('applies warning style when data is 5 days old', () => {
            const { container } = renderWithDate('2026-05-08');
            const badge = container.querySelector('[data-staleness]');
            expect(badge?.getAttribute('data-staleness')).toBe('warning');
        });

        it('applies critical style when data is 6 days old', () => {
            const { container } = renderWithDate('2026-05-07');
            const badge = container.querySelector('[data-staleness]');
            expect(badge?.getAttribute('data-staleness')).toBe('critical');
        });
    });
});
