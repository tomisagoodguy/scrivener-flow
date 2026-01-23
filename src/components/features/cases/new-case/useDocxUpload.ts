import { useState } from 'react';
import { parseDocx } from '@/app/actions/parseDocx';
import { CaseFormData } from './types';

/**
 * useDocxUpload Hook
 * 處理 DOCX 檔案上傳與自動填寫表單 (支援單一與批量)
 */
export function useDocxUpload(
    setFormData: React.Dispatch<React.SetStateAction<CaseFormData>>,
    checkDuplicate: (caseNum: string) => void
) {
    const [loading, setLoading] = useState(false);
    const [batchResults, setBatchResults] = useState<any[]>([]);

    const clearBatch = () => setBatchResults([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setLoading(true);
        const results: any[] = [];

        try {
            for (const file of files) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);

                const parsedData = await parseDocx(uploadFormData);
                results.push({
                    id: crypto.randomUUID(),
                    fileName: file.name,
                    data: parsedData,
                    status: (parsedData as any).case_number || (parsedData as any).buyer_name ? 'success' : 'error'
                });
            }

            if (files.length === 1 && results[0].status === 'success') {
                // 如果只有一個檔案，且解析成功，保持原有行為：填入單一表單
                const parsedData = results[0].data;
                setFormData(prev => ({
                    ...prev,
                    case_number: parsedData.case_number || prev.case_number,
                    buyer_name: parsedData.buyer_name || prev.buyer_name,
                    buyer_phone: parsedData.buyer_phone || prev.buyer_phone,
                    seller_name: parsedData.seller_name || prev.seller_name,
                    seller_phone: parsedData.seller_phone || prev.seller_phone,
                    registrant_name: parsedData.registrant_name || prev.registrant_name,
                    registrant_phone: parsedData.registrant_phone || prev.registrant_phone,
                    agent_name: parsedData.agent_name || prev.agent_name,
                    agent_phone: parsedData.agent_phone || prev.agent_phone,
                    escrow_account: parsedData.escrow_account || prev.escrow_account,
                    total_price: parsedData.total_price?.toString() || prev.total_price,

                    contract_date: parsedData.contract_date || prev.contract_date,
                    contract_amount: parsedData.contract_amount?.toString() || prev.contract_amount,

                    sign_diff_date: parsedData.sign_diff_date || prev.sign_diff_date,
                    sign_diff_amount: parsedData.sign_diff_amount?.toString() || prev.sign_diff_amount,

                    seal_date: parsedData.seal_date || prev.seal_date,
                    seal_amount: parsedData.seal_amount?.toString() || prev.seal_amount,

                    tax_payment_date: parsedData.tax_payment_date || prev.tax_payment_date,
                    tax_amount: parsedData.tax_amount?.toString() || prev.tax_amount,

                    balance_payment_date: parsedData.balance_payment_date || prev.balance_payment_date,
                    balance_amount: parsedData.balance_amount?.toString() || prev.balance_amount,

                    handover_date: parsedData.handover_date || prev.handover_date,
                    transfer_date: parsedData.transfer_date || prev.transfer_date,
                }));

                if (parsedData.case_number) {
                    checkDuplicate(parsedData.case_number);
                }
                alert('✅ 自動填寫完成！');
            } else if (files.length > 1) {
                // 批量上傳，更新結果列表供 UI 顯示
                setBatchResults(results);
                alert(`✅ 已解析 ${results.length} 個檔案！請確認內容後批量建立。`);
            } else if (results[0].status === 'error') {
                alert('⚠️ 無法識別資料！請確認檔案內容格式。');
            }
        } catch (err: any) {
            console.error(err);
            alert('解析失敗: ' + err.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return { loading, batchResults, handleFileUpload, clearBatch };
}
