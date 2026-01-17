'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { DemoCase } from '@/types';
import { format } from 'date-fns';

interface ExportExcelButtonProps {
    cases: DemoCase[];
    filename?: string;
}

export default function ExportExcelButton({ cases, filename = '案件清單' }: ExportExcelButtonProps) {
    const handleExport = () => {
        // 1. Transform Data for Excel
        const data = cases.map((c) => {
            const m = (c.milestones?.[0] || {}) as any;
            const f = (c.financials?.[0] || {}) as any;

            // Helper to format date
            const d = (dateStr?: string) => (dateStr ? format(new Date(dateStr), 'yyyy/MM/dd') : '');

            // Helper to format currency (divide by 10000 -> 萬)
            const money = (val?: number) => (val ? val / 10000 : '');

            // Extract Todos (Concatenate uncompleted ones)
            const todos = c.todos
                ? Object.entries(c.todos)
                      .filter(([_, done]) => !done)
                      .map(([key]) => key)
                      .join(', ')
                : '';

            return {
                案號: c.case_number,
                買方: c.buyer_name,
                賣方: c.seller_name,
                區域: c.district || c.city,
                狀態: c.status,
                '總價(萬)': f?.total_price || '',
                買方貸款: f?.buyer_bank || '',
                賣方代償: f?.seller_bank || '',
                稅單性質: c.tax_type || '一般',
                '預收規費(萬)': money(f?.pre_collected_fee),
                簽約日: d(m?.contract_date),
                用印日: d(m?.seal_date),
                完稅日: d(m?.tax_payment_date),
                過戶日: d(m?.transfer_date),
                交屋日: d(m?.handover_date),
                過戶備註: m?.transfer_note || '',
                未完成待辦: todos,
                備註: c.notes || '',
                警示: c.pending_tasks || '',
            };
        });

        // 2. Create Sheet
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Auto-width (Naive)
        const wscols = [
            { wch: 10 }, // 案號
            { wch: 10 }, // 買方
            { wch: 10 }, // 賣方
            { wch: 8 }, // 區域
            { wch: 8 }, // 狀態
            { wch: 10 }, // 總價
            { wch: 15 }, // 買方貸款
            { wch: 15 }, // 賣方代償
            { wch: 8 }, // 稅單
            { wch: 10 }, // 預收
            { wch: 12 }, // 簽
            { wch: 12 }, // 印
            { wch: 12 }, // 稅
            { wch: 12 }, // 過
            { wch: 12 }, // 交
            { wch: 20 }, // 過戶備註
            { wch: 30 }, // 待辦
            { wch: 20 }, // 備註
            { wch: 20 }, // 警示
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '案件列表');

        // 3. Download
        const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
        XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
    };

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow-sm transition-all"
            title="下載 Excel"
        >
            <span>📊 匯出 Excel</span>
        </button>
    );
}
