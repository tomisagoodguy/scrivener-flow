
import type { HeatmapYearData, HeatmapCell, ReturnBin } from '@/types/revenuelab';
import type { RevenueRow } from '@/repositories/revenueRepo';
import type { PriceRow } from '@/repositories/priceRepo';

interface BinDef {
  id: string;
  label: string;
  order: number;
  min: number;
  max: number;
}

const BIN_DEFS: BinDef[] = [
  // 下跌區間
  { id: 'b00', label: '下跌 90%+', order: 0, min: -Infinity, max: -90 },
  { id: 'b01', label: '下跌 80-90%', order: 1, min: -90, max: -80 },
  { id: 'b02', label: '下跌 70-80%', order: 2, min: -80, max: -70 },
  { id: 'b03', label: '下跌 60-70%', order: 3, min: -70, max: -60 },
  { id: 'b04', label: '下跌 50-60%', order: 4, min: -60, max: -50 },
  { id: 'b05', label: '下跌 40-50%', order: 5, min: -50, max: -40 },
  { id: 'b06', label: '下跌 30-40%', order: 6, min: -40, max: -30 },
  { id: 'b07', label: '下跌 20-30%', order: 7, min: -30, max: -20 },
  { id: 'b08', label: '下跌 10-20%', order: 8, min: -20, max: -10 },
  { id: 'b09', label: '下跌 0-10%', order: 9, min: -10, max: 0 },
  // 上漲區間
  { id: 'b10', label: '上漲 0-100%', order: 10, min: 0, max: 100 },
  { id: 'b11', label: '上漲 100-200%', order: 11, min: 100, max: 200 },
  { id: 'b12', label: '上漲 200-300%', order: 12, min: 200, max: 300 },
  { id: 'b13', label: '上漲 300-400%', order: 13, min: 300, max: 400 },
  { id: 'b14', label: '上漲 400-500%', order: 14, min: 400, max: 500 },
  { id: 'b15', label: '上漲 500-600%', order: 15, min: 500, max: 600 },
  { id: 'b16', label: '上漲 600-700%', order: 16, min: 600, max: 700 },
  { id: 'b17', label: '上漲 700-800%', order: 17, min: 700, max: 800 },
  { id: 'b18', label: '上漲 800-900%', order: 18, min: 800, max: 900 },
  { id: 'b19', label: '上漲 900-1000%', order: 19, min: 900, max: 1000 },
  { id: 'b20', label: '上漲 1000%+', order: 20, min: 1000, max: Infinity },
];

export function calculateHeatmapCells(
  year: number,
  revenueData: RevenueRow[],
  startPrices: PriceRow[],
  endPrices: PriceRow[]
): HeatmapYearData | null {
  
  if (!revenueData.length || !startPrices.length || !endPrices.length) return null;

  // 1. 計算年度漲幅
  const openMap = new Map<string, number>();
  for (const row of startPrices) {
    if (!openMap.has(row.stock_code)) openMap.set(row.stock_code, row.open);
  }
  const closeMap = new Map<string, number>();
  for (const row of endPrices) {
    if (!closeMap.has(row.stock_code)) closeMap.set(row.stock_code, row.close);
  }

  const retMap = new Map<string, number>();
  for (const [code, open] of openMap) {
    const close = closeMap.get(code);
    if (close && open > 0) {
      retMap.set(code, ((close - open) / open) * 100);
    }
  }

  // 2. 為每個股票分配 bin
  const stockBinMap = new Map<string, string>();
  for (const [code, ret] of retMap) {
    for (const bin of BIN_DEFS) {
      if (ret >= bin.min && ret < bin.max) {
        stockBinMap.set(code, bin.id);
        break;
      }
    }
  }

  // 3. 取得所有月份（格式 YYYY-MM）
  const allMonths: string[] = [
    ...new Set<string>(
      revenueData.map((r) => {
        const d = new Date(r.data_date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })
    ),
  ].sort();

  // 4. 建立 (binId, month) -> yoy[] map 以及 binId -> yoy[] (全年度匯總)
  const cellDataMap = new Map<string, number[]>();
  const binRevenueMap = new Map<string, number[]>();

  for (const row of revenueData) {
    const binId = stockBinMap.get(row.stock_code);
    if (!binId) continue;
    
    // 1. Cell Map
    const d = new Date(row.data_date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const key = `${binId}::${month}`;
    
    if (!cellDataMap.has(key)) cellDataMap.set(key, []);
    cellDataMap.get(key)!.push(row.revenue_yoy);
    
    // 2. Bin Map (All Periods)
    if (!binRevenueMap.has(binId)) binRevenueMap.set(binId, []);
    binRevenueMap.get(binId)!.push(row.revenue_yoy);
  }

  // 5. 計算 cell 統計
  const cells: HeatmapCell[] = [];
  for (const [key, values] of cellDataMap) {
    const [binId, month] = key.split('::');
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const positiveRate = (values.filter((v) => v > 0).length / values.length) * 100;

    cells.push({
      binId,
      month,
      median: Math.round(median * 10) / 10,
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      positiveRate: Math.round(positiveRate * 10) / 10,
      dataPoints: values.length,
    });
  }

  // 6. 建立 ReturnBin 列表
  const binStockMap = new Map<string, number[]>();
  for (const [code, binId] of stockBinMap) {
    const ret = retMap.get(code)!;
    if (!binStockMap.has(binId)) binStockMap.set(binId, []);
    binStockMap.get(binId)!.push(ret);
  }

  const returnBins: ReturnBin[] = BIN_DEFS.filter((b) => binStockMap.has(b.id)).map((b) => {
    const rets = binStockMap.get(b.id) ?? [];
    const avgRet = rets.reduce((s, v) => s + v, 0) / rets.length;
    
    // 計算該 Bin 的全年度營收統計
    const revenues = binRevenueMap.get(b.id) ?? [];
    let meanRevenue = 0;
    let medianRevenue = 0;
    let stdDevRevenue = 0;
    let cvRevenue = 0;
    let iqrRevenue = 0;
    let minRevenue = 0;
    let maxRevenue = 0;
    let positiveRateRevenue = 0;

    if (revenues.length > 0) {
      const sortedRev = [...revenues].sort((x, y) => x - y);
      meanRevenue = revenues.reduce((s, v) => s + v, 0) / revenues.length;
      medianRevenue = sortedRev[Math.floor(sortedRev.length / 2)];
      const variance = revenues.reduce((s, v) => s + (v - meanRevenue) ** 2, 0) / revenues.length;
      stdDevRevenue = Math.sqrt(variance);
      minRevenue = sortedRev[0];
      maxRevenue = sortedRev[sortedRev.length - 1];
      
      const q1 = sortedRev[Math.floor(sortedRev.length * 0.25)];
      const q3 = sortedRev[Math.floor(sortedRev.length * 0.75)];
      iqrRevenue = q3 - q1;
      
      cvRevenue = meanRevenue !== 0 ? (stdDevRevenue / Math.abs(meanRevenue)) * 100 : 0;
      positiveRateRevenue = (revenues.filter(r => r > 0).length / revenues.length) * 100;
    }

    return {
      id: b.id,
      label: b.label,
      order: b.order,
      stockCount: rets.length,
      avgAnnualReturn: Math.round(avgRet * 10) / 10,
      meanRevenue: Math.round(meanRevenue * 10) / 10,
      medianRevenue: Math.round(medianRevenue * 10) / 10,
      stdDevRevenue: Math.round(stdDevRevenue * 10) / 10,
      cvRevenue: Math.round(cvRevenue * 100) / 100,
      iqrRevenue: Math.round(iqrRevenue * 10) / 10,
      minRevenue: Math.round(minRevenue * 10) / 10,
      maxRevenue: Math.round(maxRevenue * 10) / 10,
      positiveRateRevenue: Math.round(positiveRateRevenue * 10) / 10,
    };
  });

  return {
    year,
    months: allMonths,
    returnBins,
    cells,
    generatedAt: new Date().toISOString(),
  };
}
