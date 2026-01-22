import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CustomTemplate, TemplateType, MessageInputs } from './messageUtils';
import { generateMessageFromTemplate } from './templateEngine';
import { SecureApi } from '@/lib/crypto/secureApi';
import { toast } from 'sonner';

/**
 * useMessageGenerator Hook
 * 處理所有訊息模板、生成邏輯、Supabase 同步
 */
export function useMessageGenerator(caseData: any) {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | string>('PREPAID_FEES');
    const [generatedText, setGeneratedText] = useState('');
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);
    const [userTemplates, setUserTemplates] = useState<CustomTemplate[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const [inputs, setInputs] = useState<MessageInputs>({
        buyerName: caseData.buyer_name || '',
        prepaidFee: caseData.financials?.[0]?.pre_collected_fee || '',
        nextPaymentDate: '',
        nextPaymentAmount: '',
        nextPaymentType: '',
        loanDiff: '',
        totalAmount: '',
        bankName: caseData.financials?.[0]?.buyer_bank || '',
        meetingTime: '',
        meetingLocation: '事務所',
    });

    /**
     * 載入使用者自訂模板
     */
    useEffect(() => {
        const loadTemplates = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_settings')
                .select('message_templates')
                .eq('user_id', user.id)
                .single();

            if (data?.message_templates) {
                setUserTemplates(data.message_templates as unknown as CustomTemplate[]);
            }
        };
        loadTemplates();
    }, []);

    /**
     * 自動計算總金額（僅在 NEXT_PAYMENT 模式）
     */
    useEffect(() => {
        if (selectedTemplate === 'NEXT_PAYMENT') {
            const total = (
                Number(inputs.nextPaymentAmount || 0) +
                Number(inputs.loanDiff || 0) +
                Number(inputs.prepaidFee || 0)
            );
            setInputs(prev => ({ ...prev, totalAmount: total.toString() }));
        }
    }, [inputs.nextPaymentAmount, inputs.loanDiff, inputs.prepaidFee, selectedTemplate]);

    /**
     * 生成訊息文字
     */
    const generate = useCallback((templateOverride?: TemplateType | string) => {
        const template = templateOverride !== undefined ? templateOverride : selectedTemplate;

        // 處理使用者自訂模板
        if (typeof template === 'string' && template.startsWith('USER_')) {
            const index = parseInt(template.replace('USER_', ''));
            if (userTemplates[index]) {
                setGeneratedText(userTemplates[index].content);
                setCopied(false);
                return;
            }
        }

        const text = generateMessageFromTemplate(template as TemplateType, inputs, caseData);
        setGeneratedText(text);
        setCopied(false);
    }, [selectedTemplate, inputs, caseData, userTemplates]);

    /**
     * 當參數變動時自動重新生成（非自訂模板）
     */
    useEffect(() => {
        if (selectedTemplate !== 'CUSTOM' && !String(selectedTemplate).startsWith('USER_')) {
            generate();
        }
    }, [inputs, generate, selectedTemplate]);

    /**
     * 儲存為自訂模板
     */
    const handleSaveTemplate = async () => {
        const name = prompt('請輸入新範本名稱：');
        if (!name) return;

        setIsSaving(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const newTemplates = [...userTemplates, { name, content: generatedText }];

            const { error } = await supabase
                .from('user_settings')
                .upsert({ user_id: user.id, message_templates: newTemplates }, { onConflict: 'user_id' });

            if (error) throw error;

            setUserTemplates(newTemplates);
            alert('✅ 範本儲存成功！');
        } catch (error) {
            console.error('Failed to save template:', error);
            alert('❌ 儲存失敗，請稍後再試');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * 刪除自訂模板
     */
    const handleDeleteTemplate = async (index: number) => {
        if (!confirm('確定要刪除此範本嗎？')) return;

        const newTemplates = userTemplates.filter((_, i) => i !== index);
        setUserTemplates(newTemplates);

        if (selectedTemplate === `USER_${index}`) {
            setSelectedTemplate('PREPAID_FEES');
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('user_settings')
                .update({ message_templates: newTemplates })
                .eq('user_id', user.id);
        }
    };

    /**
     * 複製到剪貼簿
     */
    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /**
     * 發送至 LINE Bot
     */
    const sendToLine = async () => {
        if (!generatedText) return;
        setSending(true);
        try {
            const res = await SecureApi.post<any>('/api/line/secure', {
                text: generatedText,
                caseId: caseData.id
            });

            if (res.success) {
                toast.success('訊息已發送至 LINE Bot！');
            } else {
                console.error('Line send failed:', res.error);
                toast.error('發送失敗: ' + (res.error || '未知錯誤'));
            }
        } catch (e: any) {
            console.error('Line API connection error:', e);
            toast.error('連線錯誤: ' + e.message);
        } finally {
            setSending(false);
        }
    };

    return {
        selectedTemplate,
        setSelectedTemplate,
        generatedText,
        setGeneratedText,
        copied,
        sending,
        userTemplates,
        isSaving,
        inputs,
        setInputs,
        generate,
        handleSaveTemplate,
        handleDeleteTemplate,
        copyToClipboard,
        sendToLine
    };
}
