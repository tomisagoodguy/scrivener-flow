import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RejectShareButton } from '../RejectShareButton';
import { rejectShare } from '@/services/caseShareService';

const push = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/hooks/useAuthUser', () => ({ useAuthUser: () => ({ user: { id: 'user-b' } }) }));
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
jest.mock('@/services/caseShareService', () => ({ rejectShare: jest.fn() }));

const mockedReject = rejectShare as jest.MockedFunction<typeof rejectShare>;

function confirmReject() {
    render(<RejectShareButton caseId="case-1" isOwnedByCurrentUser={false} />);
    fireEvent.click(screen.getByText('駁回分享'));
    fireEvent.click(screen.getByText('確定駁回'));
}

describe('RejectShareButton', () => {
    beforeEach(() => jest.clearAllMocks());

    it('駁回成功後導回 /cases', async () => {
        mockedReject.mockResolvedValue(undefined);
        confirmReject();
        await waitFor(() => expect(push).toHaveBeenCalledWith('/cases'));
        expect(mockedReject).toHaveBeenCalledWith({}, 'case-1', 'user-b');
    });

    it('駁回失敗時顯示錯誤、不導頁，且按鈕恢復可按', async () => {
        mockedReject.mockRejectedValue(new Error('駁回分享失敗'));
        confirmReject();
        expect(await screen.findByText('駁回分享失敗')).toBeInTheDocument();
        expect(push).not.toHaveBeenCalled();
        expect(screen.getByText('確定駁回')).not.toBeDisabled();
    });

    it('案件擁有者看不到駁回按鈕', () => {
        render(<RejectShareButton caseId="case-1" isOwnedByCurrentUser />);
        expect(screen.queryByText('駁回分享')).not.toBeInTheDocument();
    });
});
