import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveProps {
    supabase: SupabaseClient;
    caseId: string;
    notes: string;
    privateNotes: string;
    attributes: Record<string, string>;
    initialNotes?: string;
    initialPrivateNotes?: string;
}

/**
 * 案件自動存檔 Hook
 */
export function useCaseAutoSave({
    supabase,
    caseId,
    notes,
    privateNotes,
    attributes,
    initialNotes = '',
    initialPrivateNotes = ''
}: AutoSaveProps) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        const currentFullNotes = `${notes}\n\n[[ATTR:${JSON.stringify(attributes)}]]`.trim();
        const initialFullNotes = (initialNotes || '').trim();

        // 檢查是否有變更
        if (currentFullNotes === initialFullNotes && privateNotes === (initialPrivateNotes || '')) {
            return;
        }

        const timer = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const { error } = await supabase
                    .from('cases')
                    .update({
                        notes: currentFullNotes,
                        private_notes: privateNotes,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', caseId);

                if (error) throw error;

                setSaveStatus('saved');
                setLastSaved(new Date());

                // 3秒後恢復 idle 狀態
                const idleTimer = setTimeout(() => setSaveStatus('idle'), 3000);
                return () => clearTimeout(idleTimer);
            } catch (err) {
                console.error('Auto-save failed:', err);
                setSaveStatus('error');
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [notes, privateNotes, attributes, caseId, initialNotes, initialPrivateNotes, supabase]);

    return { saveStatus, lastSaved };
}
