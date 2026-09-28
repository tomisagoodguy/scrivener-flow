/**
 * TDD: written BEFORE implementation.
 * Covers case-overtime-claim-toggle task 4.1 — OvertimeClaimButton.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OvertimeClaimButton from '../OvertimeClaimButton';

const mockToggle = jest.fn();
let mockClaimed = false;
let mockIsUpdating = false;

jest.mock('@/hooks/useOvertimeClaim', () => ({
    useOvertimeClaim: () => ({
        claimed: mockClaimed,
        isUpdating: mockIsUpdating,
        toggle: mockToggle,
    }),
}));

describe('OvertimeClaimButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClaimed = false;
        mockIsUpdating = false;
    });

    it('renders the unclaimed prominent style when claimed is false', () => {
        render(<OvertimeClaimButton caseId="case_1" party="buyer" initialClaimed={false} />);
        const button = screen.getByRole('button');
        expect(button.className).toMatch(/amber/);
    });

    it('renders the neutral claimed style when claimed is true', () => {
        mockClaimed = true;
        render(<OvertimeClaimButton caseId="case_1" party="seller" initialClaimed={true} />);
        const button = screen.getByRole('button');
        expect(button.className).not.toMatch(/amber/);
    });

    it('calls toggle on click', () => {
        render(<OvertimeClaimButton caseId="case_1" party="buyer" initialClaimed={false} />);
        fireEvent.click(screen.getByRole('button'));
        expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it('disables the button while an update is in flight', () => {
        mockIsUpdating = true;
        render(<OvertimeClaimButton caseId="case_1" party="buyer" initialClaimed={false} />);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
