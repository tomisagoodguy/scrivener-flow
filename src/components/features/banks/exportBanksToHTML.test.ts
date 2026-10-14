import { exportBanksToHTML } from './exportBanksToHTML';
import { Bank } from '@/types';

describe('exportBanksToHTML', () => {
    let captured = '';
    let download = '';
    const OriginalBlob = global.Blob;

    beforeEach(() => {
        captured = '';
        global.Blob = class {
            constructor(parts: string[]) { captured = parts.join(''); }
        } as unknown as typeof Blob;
        URL.createObjectURL = jest.fn(() => 'blob:x');
        URL.revokeObjectURL = jest.fn();
        jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            download = this.download;
        });
    });

    afterEach(() => {
        global.Blob = OriginalBlob;
        jest.restoreAllMocks();
    });

    const banks: Bank[] = [
        {
            id: '1', name: '台灣銀行', branch: '城中', redemption_phone: '02-1234',
            redemption_account: '123-456 <script>alert(1)</script>', loan_conditions: '"利率" 2.1%',
            contacts: [{ name: '王小明', branch: '信義', phone: '0912', email: 'a@x.com; b@x.com' }],
        },
        { id: '2', name: "O'Bank", contacts: [] },
    ];

    it('觸發下載並以銀行資訊中心命名', () => {
        exportBanksToHTML(banks);
        expect(download).toMatch(/^銀行資訊中心_.*\.html$/);
        expect(captured).toContain('<title>銀行資訊中心</title>');
        expect(captured).toContain('共 2 家');
    });

    it('跳脫使用者資料，避免 HTML 注入', () => {
        exportBanksToHTML(banks);
        expect(captured).not.toContain('<script>alert(1)</script>');
        expect(captured).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(captured).toContain('O&#39;Bank');
        expect(captured).toContain('&quot;利率&quot;');
    });

    it('多個 email 拆成多筆可複製窗口', () => {
        exportBanksToHTML(banks);
        expect(captured).toContain('data-copy="a@x.com"');
        expect(captured).toContain('data-copy="b@x.com"');
        expect(captured).toContain('共 2 位窗口');
        expect(captured).toContain('尚無聯絡人資料');
    });
});
