import React from 'react';
import QuickNotes from '@/components/shared/QuickNotes';
import { CaseFormData } from './types';

interface NotesSectionProps {
    formData: CaseFormData;
    handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    setFormData: React.Dispatch<React.SetStateAction<CaseFormData>>;
}

export function NotesSection({ formData, handleChange, setFormData }: NotesSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                <span className="p-2 bg-foreground/5 rounded-lg text-foreground">📝</span>
                待辦與備註
            </h3>

            <div className="space-y-4">
                <textarea
                    name="notes"
                    rows={4}
                    placeholder="例如：需做輻射檢測、約定交屋地點..."
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full bg-secondary/30 border border-border rounded-2xl px-6 py-4 text-foreground font-bold focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                />
                <QuickNotes onSelect={(note) => setFormData(prev => ({ ...prev, notes: prev.notes ? `${prev.notes}\n${note}` : note }))} />
            </div>
        </div>
    );
}
