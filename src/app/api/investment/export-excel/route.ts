import { NextResponse } from 'next/server';
import { getAllHoldings, buildUnionHoldings } from '@/lib/investment/holdingsUtils';
import { fetchQuantFiltersBatched } from '@/lib/investment/quantFilters';
import { Holding } from '@/types/investment';

/**
 * GET /api/investment/export-excel
 *
 * 回傳含兩個工作表的 .xlsx 檔：
 * - Sheet 1「選股策略」：六欄策略分組（格式相容 select_stock.xlsx）
 * - Sheet 2「完整指標」：所有持股的量化指標一覽
 */
export async function GET() {
    try {
        // 1. 取得 Union Pool 完整持股（含產業/股價/營收）
        const { byEtf } = await getAllHoldings();
        const unionHoldings = buildUnionHoldings(byEtf);
        const allCodes = unionHoldings.map(h => h.stock_code);

        // 2. 取得量化篩選欄位
        const quantFilters = await fetchQuantFiltersBatched(allCodes);

        // 3. 合併量化欄位到持股
        const holdings = unionHoldings.map(h => ({
            ...h,
            ...quantFilters[h.stock_code],
        })) as Holding[];

        // 4. 建立 Excel Workbook（dynamic import 避免 SSR 問題）
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Scrivener Flow';
        workbook.created = new Date();

        // ── Sheet 1：選股策略（相容 select_stock.xlsx 格式）──────────────────

        const strategySheet = workbook.addWorksheet('選股策略');

        const columns = [
            { header: '全部池', key: 'all', width: 12 },
            { header: '三大全過', key: 'triple_pass', width: 12 },
            { header: '雙Filter', key: 'double_pass', width: 12 },
            { header: '動能通過', key: 'momentum', width: 12 },
            { header: '投信通過', key: 'it_buy', width: 12 },
            { header: '營收新高', key: 'rev_new_high', width: 12 },
        ];
        strategySheet.columns = columns;

        // 表頭樣式
        const headerRow1 = strategySheet.getRow(1);
        headerRow1.font = { bold: true };
        headerRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        headerRow1.alignment = { horizontal: 'center' };

        // 各欄篩選出的代號列表
        const all = holdings.map(h => h.stock_code);
        const triplePass = holdings.filter(h => h.filter_score === 3).map(h => h.stock_code);
        const doublePass = holdings.filter(h => (h.filter_score ?? 0) >= 2).map(h => h.stock_code);
        const momentumPass = holdings.filter(h => h.momentum_pass).map(h => h.stock_code);
        const itBuyPass = holdings.filter(h => h.it_buy_5d_pass).map(h => h.stock_code);
        const revNewHigh = holdings.filter(h => h.rev_ma3_new_high).map(h => h.stock_code);

        const maxRows = Math.max(all.length, triplePass.length, doublePass.length, momentumPass.length, itBuyPass.length, revNewHigh.length);

        for (let i = 0; i < maxRows; i++) {
            strategySheet.addRow({
                all: all[i] ?? '',
                triple_pass: triplePass[i] ?? '',
                double_pass: doublePass[i] ?? '',
                momentum: momentumPass[i] ?? '',
                it_buy: itBuyPass[i] ?? '',
                rev_new_high: revNewHigh[i] ?? '',
            });
        }

        // 代號格式設為文字（保留前導零，相容 int(cell.value) 解析）
        for (let row = 2; row <= maxRows + 1; row++) {
            for (let col = 1; col <= 6; col++) {
                const cell = strategySheet.getCell(row, col);
                if (cell.value) cell.numFmt = '@';
            }
        }

        // ── Sheet 2：完整指標 ─────────────────────────────────────────────────

        const detailSheet = workbook.addWorksheet('完整指標');

        detailSheet.columns = [
            { header: '代號', key: 'stock_code', width: 10 },
            { header: '名稱', key: 'stock_name', width: 16 },
            { header: 'ETF來源', key: 'etf_code', width: 14 },
            { header: '權重%', key: 'weight', width: 10 },
            { header: '分數(0-3)', key: 'filter_score', width: 12 },
            { header: '動能60d(%)', key: 'momentum_60d', width: 14 },
            { header: '投信5日(張)', key: 'it_buy_5d', width: 14 },
            { header: '營收新高', key: 'rev_ma3_new_high', width: 12 },
            { header: '產業', key: 'industry', width: 14 },
            { header: '收盤價', key: 'price', width: 10 },
            { header: '漲跌%', key: 'change_percent', width: 10 },
        ];

        // 表頭樣式
        const headerRow2 = detailSheet.getRow(1);
        headerRow2.font = { bold: true };
        headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        headerRow2.alignment = { horizontal: 'center' };

        // 依 filter_score 降序、weight 降序排列
        const sortedHoldings = [...holdings].sort((a, b) => {
            const scoreDiff = (b.filter_score ?? 0) - (a.filter_score ?? 0);
            if (scoreDiff !== 0) return scoreDiff;
            return (b.weight ?? 0) - (a.weight ?? 0);
        });

        for (const h of sortedHoldings) {
            detailSheet.addRow({
                stock_code: h.stock_code,
                stock_name: h.stock_name,
                etf_code: (h as unknown as Record<string, unknown>)['etf_code'] as string ?? '',
                weight: h.weight != null ? Number(h.weight.toFixed(2)) : '',
                filter_score: h.filter_score ?? 0,
                momentum_60d: h.momentum_60d != null ? Number(h.momentum_60d.toFixed(2)) : '',
                it_buy_5d: h.it_buy_5d != null ? Math.round(h.it_buy_5d) : '',
                rev_ma3_new_high: h.rev_ma3_new_high ? '✓' : '',
                industry: h.industry ?? '',
                price: h.price != null ? Number(h.price.toFixed(2)) : '',
                change_percent: h.change_percent != null ? Number(h.change_percent.toFixed(2)) : '',
            });
        }

        // 5. 輸出 Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        const dateStr = new Date().toISOString().slice(0, 10);
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="etf-pool-${dateStr}.xlsx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('[export-excel] 錯誤:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
