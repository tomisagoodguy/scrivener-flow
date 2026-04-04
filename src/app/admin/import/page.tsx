'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import * as ExcelJS from 'exceljs';
import { ImportLogs } from '@/components/features/admin-import/ImportLogs';
import { ImportFileUpload } from '@/components/features/admin-import/ImportFileUpload';

export default function ImportPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setLogs(['開始讀取檔案...', 'Analyzing ' + file.name]);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            addLog(`讀取工作表: ${worksheet.name}, 總列數: ${worksheet.rowCount}`);

            const rows: any[] = [];
            const headerRowIndex = 1;
            const headerRow = worksheet.getRow(headerRowIndex);

            const headers: string[] = [];
            headerRow.eachCell((cell, colNumber) => {
                const val = cell.value?.toString().trim() || '';
                headers[colNumber] = val;
            });

            addLog(`偵測到的標題列 (${headers.filter((h) => h).length}欄): ${headers.filter((h) => h).join(', ')}`);

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === headerRowIndex) return;

                const rowData: any = {};
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber];
                    if (header) {
                        let value = cell.value;
                        if (value && typeof value === 'object') {
                            if ('text' in value) value = (value as any).text;
                            else if ('result' in value) value = (value as any).result;
                            else if ('hyperlink' in value) value = (value as any).text || (value as any).hyperlink;
                        }
                        if (typeof value === 'string') value = value.trim();
                        rowData[header] = value;
                    }
                });
                if (Object.keys(rowData).length > 0) rows.push(rowData);
            });

            if (rows.length > 0) {
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

                    const notesParts = [];
                    if (row['應注意']) notesParts.push(`【應注意】: ${row['應注意']}`);
                    if (row['未完成']) notesParts.push(`【未完成】: ${row['未完成']}`);
                    if (row['更多備註']) notesParts.push(row['更多備註']);
                    if (row['備註']) notesParts.push(row['備註']);

                    const miscInfo = row['印章、帳戶、稅費找補、時間地點'] || '';
                    if (miscInfo) notesParts.push(`雜項: ${miscInfo}`);

                    let detectedLocation = '未指定';
                    if (miscInfo.includes('士林')) detectedLocation = '士林';
                    else if (miscInfo.includes('內湖')) detectedLocation = '內湖';

                    const bankInfo = row['銀行'] || row['Bank'];
                    if (bankInfo) notesParts.push(`貸款銀行: ${bankInfo}`);

                    const { data: caseData, error: caseError } = await supabase
                        .from('cases')
                        .upsert({
                            case_number: caseNumber.toString(),
                            buyer_name: row['買方'] || row['Buyer'] || 'Unknown',
                            seller_name: row['屋主'] || row['賣方'] || row['Seller'] || 'Unknown',
                            city: detectedLocation,
                            district: '-',
                            status: 'Processing',
                            notes: notesParts.join('\n\n'),
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'case_number' })
                        .select('id')
                        .single();

                    if (caseError) throw new Error(`Case Error: ${caseError.message}`);
                    const caseId = caseData.id;

                    const { data: existingMilestone } = await supabase.from('milestones').select('id').eq('case_id', caseId).maybeSingle();
                    const milestonePayload: any = {
                        case_id: caseId,
                        contract_date: toDate(row['簽約日'] || row['簽約']),
                        seal_date: toDate(row['用印日'] || row['用印']),
                        tax_payment_date: toDate(row['完稅日'] || row['完稅']),
                        transfer_date: toDate(row['過戶日'] || row['過戶']),
                        handover_date: toDate(row['交屋日'] || row['交屋']),
                    };
                    if (existingMilestone) milestonePayload.id = existingMilestone.id;
                    await supabase.from('milestones').upsert(milestonePayload);

                    const { data: existingFinancial } = await supabase.from('financials').select('id').eq('case_id', caseId).maybeSingle();
                    const financialPayload: any = {
                        case_id: caseId,
                        vat_type: row['類型'] === '自用' ? 'Self_Use' : 'General',
                        buyer_bank: bankInfo || '',
                    };
                    if (existingFinancial) financialPayload.id = existingFinancial.id;
                    await supabase.from('financials').upsert(financialPayload);

                    successCount++;
                } catch (err: any) {
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
            addLog(`[FATAL ERROR] ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">資料匯入 (Admin)</h1>
                    <p className="text-slate-500 mt-2 font-medium">舊 Excel 資料無痛轉移</p>
                </div>
                <Link
                    href="/"
                    className="glass px-6 py-2 rounded-full text-sm font-semibold hover:bg-white/80 transition-all text-slate-700 hover:text-primary flex items-center gap-2 group"
                >
                    <span>←</span> 回首頁
                </Link>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImportFileUpload loading={loading} onFileUpload={handleFileUpload} />
                <ImportLogs logs={logs} />
            </main>

            <style jsx global>{`
                .excel-scrollbar::-webkit-scrollbar { width: 6px; }
                .excel-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .excel-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}
