'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
// ExcelJS is better imported dynamically or used as a lightweight alternative if valid
import * as ExcelJS from 'exceljs';

export default function ImportPage() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setLogs(['開始讀取檔案...', 'Analyzing ' + file.name]);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0]; // Assume first sheet for now
            addLog(`讀取工作表: ${worksheet.name}, 總列數: ${worksheet.rowCount}`);

            const rows: any[] = [];

            // Get Headers and handle potential empty first rows or whitespace
            let headerRowIndex = 1;
            // Simple heuristic: First row in Excel often headers.
            const headerRow = worksheet.getRow(headerRowIndex);

            const headers: string[] = [];
            headerRow.eachCell((cell, colNumber) => {
                const val = cell.value?.toString().trim() || '';
                headers[colNumber] = val;
            });

            addLog(`偵測到的標題列 (${headers.filter(h => h).length}欄): ${headers.filter(h => h).join(', ')}`);

            // Parse Rows
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === headerRowIndex) return; // Skip header

                const rowData: any = {};
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber];
                    if (header) {
                        // Robust value handling
                        let value = cell.value;
                        if (value && typeof value === 'object') {
                            if ('text' in value) value = (value as any).text; // Rich Text
                            else if ('result' in value) value = (value as any).result; // Formula
                            else if ('hyperlink' in value) value = (value as any).text || (value as any).hyperlink;
                        }
                        // Trim strings
                        if (typeof value === 'string') value = value.trim();

                        rowData[header] = value;
                    }
                });
                if (Object.keys(rowData).length > 0) {
                    rows.push(rowData);
                }
            });

            if (rows.length > 0) {
                // Log first row for debugging
                console.log('First Row Data:', JSON.stringify(rows[0], null, 2));
                addLog(`第一筆資料範例 Keys: ${Object.keys(rows[0]).join(', ')}`);
            }


            addLog(`解析完成，共 ${rows.length} 筆資料。開始匯入...`);

            let successCount = 0;
            let failCount = 0;

            for (const [index, row] of rows.entries()) {
                let caseNumber = row['物編'] || row['CaseID'] || row['案號'];
                if (!caseNumber) {
                    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                    caseNumber = `IMP-${dateStr}-${String(index + 1).padStart(3, '0')}`;
                }

                try {
                    const toDate = (val: any) => {
                        if (!val) return null;
                        if (val instanceof Date) return val.toISOString();
                        const dateStr = String(val).trim();
                        if (!dateStr) return null;
                        try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) return d.toISOString();
                        } catch { }
                        return null;
                    };

                    // Notes
                    const notesParts = [];
                    // Use special markers for "Attention" and "Pending" so UI can parse them back later if needed
                    // Or just treat them as text blocks for now.
                    if (row['應注意']) notesParts.push(`【應注意】: ${row['應注意']}`);
                    if (row['未完成']) notesParts.push(`【未完成】: ${row['未完成']}`);
                    if (row['更多備註']) notesParts.push(row['更多備註']);
                    if (row['備註']) notesParts.push(row['備註']);

                    const miscInfo = row['印章、帳戶、稅費找補、時間地點'] || '';
                    if (miscInfo) notesParts.push(`雜項: ${miscInfo}`);

                    // Location Logic
                    let detectedLocation = '未指定';
                    if (miscInfo.includes('士林')) detectedLocation = '士林';
                    else if (miscInfo.includes('內湖')) detectedLocation = '內湖';

                    const bankInfo = row['銀行'] || row['Bank'];
                    // Backup bank info in notes
                    if (bankInfo) notesParts.push(`貸款銀行: ${bankInfo}`);

                    // 1. CASES Table
                    const casePayload = {
                        case_number: caseNumber.toString(),
                        buyer_name: row['買方'] || row['Buyer'] || 'Unknown',
                        seller_name: row['屋主'] || row['賣方'] || row['Seller'] || 'Unknown',
                        // Map Location to City
                        city: detectedLocation,
                        district: '-',
                        status: 'Processing',
                        notes: notesParts.join('\n\n'),
                        updated_at: new Date().toISOString()
                    };

                    const { data: caseData, error: caseError } = await supabase
                        .from('cases')
                        .upsert(casePayload, { onConflict: 'case_number' })
                        .select('id')
                        .single();

                    if (caseError) throw new Error(`Case Error: ${caseError.message}`);
                    const caseId = caseData.id;

                    // 2. MILESTONES Table
                    // Try to match existing milestone by case_id
                    const { data: existingMilestone } = await supabase
                        .from('milestones')
                        .select('id')
                        .eq('case_id', caseId)
                        .maybeSingle();

                    const milestonePayload: any = {
                        case_id: caseId,
                        contract_date: toDate(row['簽約日'] || row['簽約']),
                        seal_date: toDate(row['用印日'] || row['用印']),
                        tax_payment_date: toDate(row['完稅日'] || row['完稅']),
                        transfer_date: toDate(row['過戶日'] || row['過戶']),
                        handover_date: toDate(row['交屋日'] || row['交屋']),
                    };
                    if (existingMilestone) milestonePayload.id = existingMilestone.id;

                    const { error: mileError } = await supabase
                        .from('milestones')
                        .upsert(milestonePayload);

                    if (mileError) console.warn('Milestone Upsert Error (Non-fatal)', mileError);

                    // 3. FINANCIALS Table
                    const { data: existingFinancial } = await supabase
                        .from('financials')
                        .select('id')
                        .eq('case_id', caseId)
                        .maybeSingle();

                    const financialPayload: any = {
                        case_id: caseId,
                        vat_type: row['類型'] === '自用' ? 'Self_Use' : 'General',
                        buyer_bank: bankInfo || '',
                    };
                    if (existingFinancial) financialPayload.id = existingFinancial.id;

                    const { error: finError } = await supabase
                        .from('financials')
                        .upsert(financialPayload);

                    if (finError) console.warn('Financial Upsert Error (Non-fatal)', finError);

                    successCount++;
                } catch (err: any) {
                    console.error('Import Error Row:', row, err);
                    failCount++;
                    addLog(`[Error] ${caseNumber}: ${err.message}`);
                }
            }

            addLog(`匯入作業結束。成功: ${successCount}, 失敗: ${failCount}`);
            if (successCount > 0) {
                addLog('即將重新整理頁面...');
                setTimeout(() => window.location.reload(), 2000);
            }

        } catch (err: any) {
            console.error(err);
            addLog(`[FATAL ERROR] ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold text-foreground hover:scale-[1.01] transition-transform origin-left">
                        資料匯入 (Admin)
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">舊 Excel 資料無痛轉移</p>
                </div>
                <Link href="/" className="glass px-6 py-2 rounded-full text-sm font-semibold hover:bg-white/80 transition-all text-slate-700 hover:text-primary flex items-center gap-2 group">
                    <span>←</span> 回首頁
                </Link>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Area */}
                <div className="glass-card p-12 flex flex-col items-center justify-center border-dashed border-2 border-white/40 hover:border-primary/50 transition-colors relative overflow-hidden group animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        disabled={loading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />

                    <div className="text-center space-y-4 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-colors ${loading ? 'bg-primary/10 text-primary animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                            {loading ? (
                                <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-foreground">
                            {loading ? '正在分析檔案...' : '點擊或拖曳上傳 Excel'}
                        </h3>
                        <p className="text-slate-500 font-medium">
                            支援 .xlsx, .xls 格式
                        </p>
                    </div>
                </div>

                {/* Log Console */}
                <div className="glass-card p-6 font-mono text-sm h-96 overflow-y-auto excel-scrollbar bg-white/40 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <h4 className="text-foreground font-bold mb-4 sticky top-0 bg-white/0 backdrop-blur-sm pb-2 border-b border-gray-200/50 flex items-center justify-between">
                        <span>執行紀錄</span>
                        <span className="text-xs text-slate-400 font-normal">System Console</span>
                    </h4>
                    {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <span>等待操作命令...</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log, i) => (
                                <div key={i} className="text-slate-700 border-l-2 border-primary/30 pl-3 py-1 hover:bg-white/30 rounded-r transition-colors">
                                    <span className="text-primary-deep/60 text-xs font-bold mr-2 block mb-0.5">[{new Date().toLocaleTimeString()}]</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <style jsx global>{`
                .excel-scrollbar::-webkit-scrollbar { width: 6px; }
                .excel-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .excel-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .excel-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}
