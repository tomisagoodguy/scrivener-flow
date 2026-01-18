'use client';

import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { DemoCase } from '@/types';
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';

interface ExportExcelButtonProps {
    cases: DemoCase[];
    filename?: string;
}

export default function ExportExcelButton({ cases, filename = '案件清單' }: ExportExcelButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!cases || cases.length === 0) {
            alert('沒有案件資料可以匯出');
            return;
        }

        try {
            setIsExporting(true);

            // Dynamic import to avoid SSR/Loading issues with ExcelJS
            const ExcelJS = await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('案件列表');

            // Define columns
            worksheet.columns = [
                { header: '案號', key: 'case_number', width: 15 },
                { header: '區域', key: 'district', width: 10 },
                { header: '買方', key: 'buyer_name', width: 12 },
                { header: '賣方', key: 'seller_name', width: 12 },
                { header: '狀態', key: 'status', width: 10 },
                { header: '總價(萬)', key: 'total_price', width: 12 },
                { header: '買方貸款', key: 'buyer_bank', width: 15 },
                { header: '賣方代償', key: 'seller_bank', width: 15 },
                { header: '稅單性質', key: 'tax_type', width: 10 },
                { header: '預收規費(萬)', key: 'pre_collected_fee', width: 15 },
                { header: '簽約日', key: 'contract_date', width: 12 },
                { header: '用印日', key: 'seal_date', width: 12 },
                { header: '完稅日', key: 'tax_payment_date', width: 12 },
                { header: '過戶日', key: 'transfer_date', width: 12 },
                { header: '交屋日', key: 'handover_date', width: 12 },
                { header: '過戶備註', key: 'transfer_note', width: 20 },
                { header: '未完成待辦', key: 'todos', width: 30 },
                { header: '備註', key: 'notes', width: 25 },
                { header: '警示', key: 'pending_tasks', width: 25 },
            ];

            // Add Header Row Style
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Process data values
            const rows = cases.map((c) => {
                // Determine milestone/financial object (handle Array vs Object)
                // Using 'as any' to bypass strict checks on optional relational fields
                const m = (Array.isArray(c.milestones) ? c.milestones[0] || {} : c.milestones || {}) as any;
                const f = (Array.isArray(c.financials) ? c.financials[0] || {} : c.financials || {}) as any;

                const formatDate = (dateStr?: string) => {
                    if (!dateStr) return '';
                    try { return format(new Date(dateStr), 'yyyy/MM/dd'); } catch { return dateStr; }
                };

                const formatMoney = (val?: number) => (val ? val / 10000 : '');

                let todoStr = '';
                if (c.todos && typeof c.todos === 'object') {
                    todoStr = Object.entries(c.todos)
                        .filter(([_, done]) => !done)
                        .map(([key]) => key)
                        .join(', ');
                }

                return {
                    case_number: c.case_number,
                    district: c.district || c.city,
                    buyer_name: c.buyer_name,
                    seller_name: c.seller_name,
                    status: c.status,
                    total_price: f?.total_price || '',
                    buyer_bank: f?.buyer_bank || '',
                    seller_bank: f?.seller_bank || '',
                    tax_type: c.tax_type || '一般',
                    pre_collected_fee: formatMoney(f?.pre_collected_fee),
                    contract_date: formatDate(m?.contract_date),
                    seal_date: formatDate(m?.seal_date),
                    tax_payment_date: formatDate(m?.tax_payment_date),
                    transfer_date: formatDate(m?.transfer_date),
                    handover_date: formatDate(m?.handover_date),
                    transfer_note: m?.transfer_note || '',
                    todos: todoStr,
                    notes: c.notes || '',
                    pending_tasks: c.pending_tasks || '',
                };
            });

            // Add rows to worksheet
            worksheet.addRows(rows);

            // Write to buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Create Blob and Save
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
            const fullFileName = `${filename}_${dateStr}.xlsx`;

            saveAs(blob, fullFileName);

        } catch (error) {
            console.error('Excel export failed:', error);
            alert(`Excel 匯出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className={`
                flex items-center gap-2 px-3 py-1.5 
                bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed
                text-white text-xs font-bold rounded shadow-sm transition-all
            `}
            title="下載 Excel"
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>匯出中...</span>
                </>
            ) : (
                <>
                    <Download className="w-3.5 h-3.5" />
                    <span>匯出 Excel</span>
                </>
            )}
        </button>
    );
}
