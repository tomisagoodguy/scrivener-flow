import crypto from 'crypto';
import { verifyLineSignature } from '@/lib/lineService';

function makeSignature(body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

describe('verifyLineSignature', () => {
    const SECRET = 'test-secret-key';
    const BODY = '{"events":[]}';

    beforeEach(() => {
        process.env.LINE_CHANNEL_SECRET = SECRET;
    });

    afterEach(() => {
        delete process.env.LINE_CHANNEL_SECRET;
    });

    it('passes when signature is correct', () => {
        const sig = makeSignature(BODY, SECRET);
        expect(verifyLineSignature(BODY, sig)).toBe(true);
    });

    it('rejects when signature is wrong', () => {
        expect(verifyLineSignature(BODY, 'bad-signature')).toBe(false);
    });

    it('returns false when LINE_CHANNEL_SECRET is not set', () => {
        delete process.env.LINE_CHANNEL_SECRET;
        const sig = makeSignature(BODY, SECRET);
        expect(verifyLineSignature(BODY, sig)).toBe(false);
    });
});
