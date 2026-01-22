import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RedemptionInfo } from './types';

export function useRedemptions() {
    const [redemptions, setRedemptions] = useState<RedemptionInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentData, setCurrentData] = useState<Partial<RedemptionInfo>>({});

    const fetchRedemptions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bank_redemptions')
                .select('*')
                .order('bank_name', { ascending: true });

            if (error) throw error;
            setRedemptions(data || []);
        } catch (error) {
            console.error('Error fetching redemptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                alert('請先登入');
                return;
            }

            const dataToSave = {
                ...currentData,
                updated_at: new Date().toISOString(),
            };

            let error;
            if (currentData.id) {
                const { error: updateError } = await supabase
                    .from('bank_redemptions')
                    .update(dataToSave)
                    .eq('id', currentData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('bank_redemptions')
                    .insert([dataToSave]);
                error = insertError;
            }

            if (error) throw error;

            setIsEditing(false);
            setCurrentData({});
            fetchRedemptions();
        } catch (error: any) {
            console.error('Error saving:', error);
            alert('儲存失敗: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除此筆資料嗎？')) return;

        try {
            const { error } = await supabase
                .from('bank_redemptions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchRedemptions();
        } catch (error: any) {
            console.error('Error deleting:', error);
            alert('刪除失敗');
        }
    };

    useEffect(() => {
        fetchRedemptions();
    }, []);

    return {
        redemptions,
        loading,
        isEditing,
        setIsEditing,
        currentData,
        setCurrentData,
        fetchRedemptions,
        handleSave,
        handleDelete
    };
}
