'use client';

import React from 'react';
import RichTextEditor from '@/components/knowledge/RichTextEditor';
import { NoteSidebar } from './NoteSidebar';

interface Note {
    id: string;
    title: string;
    content: string;
}

interface QuickNotesSectionProps {
    notes: Note[];
    activeNoteId: string;
    onSetActiveNoteId: (id: string) => void;
    onAddNote: () => void;
    onDeleteNote: (id: string) => void;
    onRenameNote: (id: string, title: string) => void;
    onUpdateContent: (content: string) => void;
    onPhraseSelect: (phrase: string) => void;
}

export function QuickNotesSection({
    notes,
    activeNoteId,
    onSetActiveNoteId,
    onAddNote,
    onDeleteNote,
    onRenameNote,
    onUpdateContent,
    onPhraseSelect
}: QuickNotesSectionProps) {
    const activeNote = notes.find((n) => n.id === activeNoteId);

    return (
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row w-full">
            <NoteSidebar
                notes={notes}
                activeNoteId={activeNoteId}
                onSelect={onSetActiveNoteId}
                onAdd={onAddNote}
                onDelete={onDeleteNote}
            />

            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                <input
                    value={activeNote?.title || ''}
                    onChange={(e) => onRenameNote(activeNoteId, e.target.value)}
                    className="w-full px-4 py-3 text-sm font-bold bg-transparent border-b border-gray-100 dark:border-slate-800 outline-none focus:bg-slate-50/50 transition-colors"
                    placeholder="筆記標題..."
                />
                <div className="flex-1 overflow-hidden">
                    <RichTextEditor
                        value={activeNote?.content || ''}
                        onChange={onUpdateContent}
                    />
                </div>
                {/* Phrases */}
                <div className="h-10 border-t border-gray-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-slate-50/30 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">快速插入:</span>
                    {['待辦事項:', '會議記錄:', '客戶需求:', '重要提醒:', '電話記錄:'].map(phrase => (
                        <button
                            key={phrase}
                            onClick={() => onPhraseSelect(phrase)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                        >
                            {phrase}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
