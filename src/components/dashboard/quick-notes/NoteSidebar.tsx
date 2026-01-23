'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

interface Note {
    id: string;
    title: string;
    content: string;
}

interface NoteSidebarProps {
    notes: Note[];
    activeNoteId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
}

export function NoteSidebar({ notes, activeNoteId, onSelect, onAdd, onDelete }: NoteSidebarProps) {
    return (
        <div className="w-full md:w-32 bg-slate-50/50 dark:bg-slate-900/50 border-r border-gray-100 dark:border-slate-800 flex flex-col">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        onClick={() => onSelect(note.id)}
                        className={`group relative px-3 py-2 rounded-lg cursor-pointer transition-all ${activeNoteId === note.id
                            ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-600 font-bold'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <div className="text-xs truncate pr-4">{note.title}</div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(note.id);
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
            <button
                onClick={onAdd}
                className="m-2 p-2 text-xs font-bold text-center border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-purple-500 hover:text-purple-600 transition-all"
            >
                + 新增
            </button>
        </div>
    );
}
