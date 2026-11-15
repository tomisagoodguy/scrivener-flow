// jsdom 環境（全域 setup 需要 window）沒有 Web Request/Response，route 只用到 request.url 與 NextResponse.json
jest.mock('next/server', () => ({
    NextResponse: {
        json: (body: unknown, init?: { status?: number }) => ({
            status: init?.status ?? 200,
            json: async () => body,
        }),
    },
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => ({ from: jest.fn() })) }));
jest.mock('@/lib/investment/weightHistoryData', () => ({ fetchWeightHistory: jest.fn() }));

import type { NextRequest } from 'next/server';
import { fetchWeightHistory } from '@/lib/investment/weightHistoryData';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { GET } from '../route';

const req = (qs: string) => ({ url: `http://localhost/api/investment/etf-weight-history${qs}` }) as NextRequest;

describe('GET /api/investment/etf-weight-history', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when code is missing', async () => {
        const res = await GET(req(''));
        expect(res.status).toBe(400);
        expect(fetchWeightHistory).not.toHaveBeenCalled();
    });

    it('reads every registered ETF for the stock and groups rows by etf_code', async () => {
        (fetchWeightHistory as jest.Mock).mockResolvedValue([
            { etf_code: '00981A', data_date: '2026-11-12', weight: 9.1, rank: 1 },
            { etf_code: '00980A', data_date: '2026-11-13', weight: null, rank: null },
            { etf_code: '00981A', data_date: '2026-11-13', weight: 9.5, rank: 1 },
        ]);
        const res = await GET(req('?code=2330'));
        expect(res.status).toBe(200);
        expect((fetchWeightHistory as jest.Mock).mock.calls[0][1]).toEqual({ etfCodes: [...ETF_CODES], stockCode: '2330' });

        const body = await res.json();
        expect(Object.keys(body).sort()).toEqual([...ETF_CODES].sort());
        expect(body['00981A']).toEqual([
            { date: '2026-11-12', weight: 9.1, rank: 1 },
            { date: '2026-11-13', weight: 9.5, rank: 1 },
        ]);
        expect(body['00980A']).toEqual([{ date: '2026-11-13', weight: 0, rank: 0 }]);
    });

    it('returns 500 with the error message when the read fails', async () => {
        (fetchWeightHistory as jest.Mock).mockRejectedValue(new Error('etf_weight_history: canceling statement due to statement timeout'));
        const res = await GET(req('?code=2330'));
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'etf_weight_history: canceling statement due to statement timeout' });
    });
});
