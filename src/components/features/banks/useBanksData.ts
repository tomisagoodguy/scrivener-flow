import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bank } from '@/types';
import { BANK_CONTACTS, BANK_REDEMPTION_INFO } from '@/data/bankData';
import { toast } from 'sonner';

/**
 * useBanksData Hook
 * 管理銀行資料的抓取、CRUD 操作與狀態
 */
export function useBanksData() {
    const [banks, setBanks] = useState<Bank[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDbMode, setIsDbMode] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBank, setCurrentBank] = useState<Partial<Bank>>({});

    const supabase = createClient();

    /**
     * 從本地資料生成銀行列表（作為 fallback）
     */
    const generateLocalBanks = (): Bank[] => {
        const contactBanks = BANK_CONTACTS.map(c => (c as any).credit_system || c.bank_name);
        const redemptionBanks = BANK_REDEMPTION_INFO.map(r => r.bank_name);
        const allNames = Array.from(new Set([...contactBanks, ...redemptionBanks])).filter(Boolean).sort();

        return allNames.map(name => {
            const r = BANK_REDEMPTION_INFO.find(i => i.bank_name === name);
            const relatedContacts = BANK_CONTACTS.filter(c =>
                ((c as any).credit_system === name) || (c.bank_name === name)
            );

            return {
                id: `local-${name}`,
                name: name,
                loan_conditions: '',
                redemption_phone: r?.phone || '',
                redemption_account: r?.account_info || '',
                redemption_days: r?.processing_days || '',
                redemption_location: r?.pickup_location || '',
                redemption_note: [r?.requirements, r?.notes].filter(Boolean).join('\n'),
                contacts: relatedContacts,
            };
        });
    };

    /**
     * 抓取銀行資料（DB + 本地合併）
     */
    const fetchBanks = async () => {
        setIsLoading(true);

        const localBanks = generateLocalBanks();
        const bankMap = new Map<string, Bank>();

        localBanks.forEach(b => bankMap.set(b.name, b));

        try {
            const { data, error } = await supabase
                .from('banks')
                .select('*')
                .order('name', { ascending: true });

            if (data) {
                data.forEach(dbBank => {
                    bankMap.set(dbBank.name, dbBank);
                });
                setIsDbMode(true);
            } else if (error) {
                console.warn("Supabase fetch error:", error.message);
                setIsDbMode(false);
            }
        } catch (e) {
            console.error("Fetch failed:", e);
            setIsDbMode(false);
        } finally {
            const finalBanks = Array.from(bankMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
            setBanks(finalBanks);
            setIsLoading(false);
        }
    };

    /**
     * 儲存銀行資料（新增或更新）
     */
    const handleSave = async () => {
        if (!currentBank.name) {
            alert('銀行名稱為必填');
            return;
        }

        if (!isDbMode) {
            alert('目前為唯讀模式（尚未連接資料庫 table）。請先建立 banks 資料表。');
            return;
        }

        try {
            const payload = {
                name: currentBank.name,
                branch: currentBank.branch,
                loan_conditions: currentBank.loan_conditions,
                redemption_phone: currentBank.redemption_phone,
                redemption_account: currentBank.redemption_account,
                redemption_days: currentBank.redemption_days,
                redemption_location: currentBank.redemption_location,
                redemption_note: currentBank.redemption_note,
                contacts: currentBank.contacts || [],
            };

            if (currentBank.id && !currentBank.id.startsWith('local-')) {
                const { error } = await supabase.from('banks').update(payload).eq('id', currentBank.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('banks').insert([payload]);
                if (error) throw error;
            }

            setIsEditing(false);
            setCurrentBank({});
            fetchBanks();
            toast.success('儲存成功');
        } catch (e: any) {
            alert('儲存失敗: ' + e.message);
        }
    };

    /**
     * 刪除銀行資料
     */
    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這筆銀行資料嗎？')) return;
        if (!isDbMode) return;

        const { error } = await supabase.from('banks').delete().eq('id', id);
        if (error) {
            alert('刪除失敗');
        } else {
            fetchBanks();
        }
    };

    /**
     * 開始編輯銀行資料
     */
    const startEdit = (bank?: Bank) => {
        if (bank) {
            setCurrentBank(bank);
        } else {
            setCurrentBank({
                name: '',
                contacts: [],
            });
        }
        setIsEditing(true);
    };

    /**
     * 聯絡人管理函數
     */
    const addContact = () => {
        const newContacts = [...(currentBank.contacts || []), { name: '', branch: '', phone: '', email: '' }];
        setCurrentBank({ ...currentBank, contacts: newContacts });
    };

    const updateContact = (index: number, field: string, value: string) => {
        const newContacts = [...(currentBank.contacts || [])];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setCurrentBank({ ...currentBank, contacts: newContacts });
    };

    const removeContact = (index: number) => {
        const newContacts = [...(currentBank.contacts || [])];
        newContacts.splice(index, 1);
        setCurrentBank({ ...currentBank, contacts: newContacts });
    };

    // 初始化抓取
    useEffect(() => {
        fetchBanks();
    }, []);

    return {
        banks,
        isLoading,
        isDbMode,
        isEditing,
        currentBank,
        setCurrentBank,
        setIsEditing,
        fetchBanks,
        handleSave,
        handleDelete,
        startEdit,
        addContact,
        updateContact,
        removeContact,
    };
}
