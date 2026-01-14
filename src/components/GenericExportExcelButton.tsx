'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ColumnDef {
    header: string;
    key: string;
    width?: number;
    format?: (val: any) => any;
}

interface GenericExportExcelButtonProps {
    data: any[];
    columns: ColumnDef[];
    filename?: string;
    sheetName?: string;
    buttonText?: string;
    className?: string;
}

export default function GenericExportExcelButton({
    data,
    columns,
    filename = 'export',
    sheetName = 'Sheet1',
    buttonText = '匯出 Excel',
    className = "flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow-sm transition-all"
}: GenericExportExcelButtonProps) {
    const handleExport = () => {
        // 1. Transform Data
        const excelData = data.map(item => {
            const row: Record<string, any> = {};
            columns.forEach(col => {
                const val = item[col.key];
                row[col.header] = col.format ? col.format(val) : val;
            });
            return row;
        });

        // 2. Create Sheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths if provided
        if (columns.some(c => c.width)) {
            worksheet['!cols'] = columns.map(c => ({ wch: c.width || 10 }));
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 3. Download
        const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
        XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
    };

    return (
        <button
            onClick={handleExport}
            className={className}
            title={buttonText}
        >
            <span>📊 {buttonText}</span>
        </button>
    );
}
