import React from 'react';
import { render, screen } from '@testing-library/react';
import ConsensusControls from '@/components/features/strategy/ConsensusControls';

jest.mock('next/link', () => {
    const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    );
    MockLink.displayName = 'MockLink';
    return MockLink;
});

describe('ConsensusControls', () => {
    it('preserves other params and omits defaults in hrefs', () => {
        render(<ConsensusControls params={{ minCount: 3, view: 'matrix', window: 'latest' }} />);
        expect(screen.getByText('近14天').getAttribute('href')).toBe('/investment/strategy?cmin=3&cview=matrix&cwin=14');
        expect(screen.getByText('≥2').getAttribute('href')).toBe('/investment/strategy?cview=matrix');
        expect(screen.getByText('列表').getAttribute('href')).toBe('/investment/strategy?cmin=3');
    });

    it('links to bare path when all params are default', () => {
        render(<ConsensusControls params={{ minCount: 3, view: 'list', window: 'latest' }} />);
        expect(screen.getByText('≥2').getAttribute('href')).toBe('/investment/strategy');
    });

    it('highlights the active options', () => {
        render(<ConsensusControls params={{ minCount: 4, view: 'list', window: 30 }} />);
        expect(screen.getByText('≥4').className).toMatch(/font-medium/);
        expect(screen.getByText('近30天').className).toMatch(/font-medium/);
        expect(screen.getByText('≥2').className).not.toMatch(/font-medium/);
    });
});
