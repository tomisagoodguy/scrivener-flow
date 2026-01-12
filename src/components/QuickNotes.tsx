'use client';

import React from 'react';

const DEFAULT_NOTES = [
    "報稅前檢查是否要退稅",
    "自用通知客戶戶籍要遷入",
    "解約檢測條款",
    "貸款提早好的 打設定時要注意提醒銀行立契日不要押",
    "用印前測輻射",
    "增值稅重購退稅",
    "房地合一",
    "財交",
    "用印前塗二胎",
    "繼承取得",
    "準備交屋丟水電",
    "過戶完約交屋",
    "等換約換好 丟水電",
    "解約",
    "房地賣重購",
    "房地合一退稅(買方)"
];

interface QuickNotesProps {
    onSelect: (note: string) => void;
}

export default function QuickNotes({ onSelect }: QuickNotesProps) {
    const [customNotes, setCustomNotes] = React.useState<string[]>([]);
    const [isAdding, setIsAdding] = React.useState(false);
    const [newNote, setNewNote] = React.useState('');

    React.useEffect(() => {
        const saved = localStorage.getItem('user_quick_notes');
        if (saved) {
            try {
                setCustomNotes(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse user_quick_notes', e);
            }
        }
    }, []);

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const updated = [...customNotes, newNote.trim()];
        setCustomNotes(updated);
        localStorage.setItem('user_quick_notes', JSON.stringify(updated));
        setNewNote('');
        setIsAdding(false);
    };

    const handleDeleteNote = (index: number) => {
        if (window.confirm('確定要刪除這個自訂項目嗎？')) {
            const updated = customNotes.filter((_, i) => i !== index);
            setCustomNotes(updated);
            localStorage.setItem('user_quick_notes', JSON.stringify(updated));
        }
    };

    return (
        <div className="flex flex-col gap-2 mt-2">
            <div className="flex flex-wrap gap-2 items-center">
                {DEFAULT_NOTES.map((note) => (
                    <button
                        key={note}
                        type="button"
                        onClick={() => onSelect(note)}
                        className="px-4 py-2 text-sm font-medium bg-background border border-border-color shadow-sm rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all text-foreground/80 active:scale-95 text-left"
                    >
                        + {note}
                    </button>
                ))}

                {customNotes.map((note, index) => (
                    <div key={`${note}-${index}`} className="flex items-center gap-1 group">
                        <button
                            type="button"
                            onClick={() => onSelect(note)}
                            className="px-3 py-2 text-sm font-medium bg-amber-50 border border-amber-200 shadow-sm rounded-l-lg hover:bg-amber-100 text-amber-900 transition-colors text-left flex-1 max-w-[200px] truncate"
                        >
                            + {note}
                        </button>
                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                if (window.confirm('確定要刪除這個常用語嗎？')) {
                                    const updated = [...customNotes];
                                    updated.splice(index, 1);
                                    setCustomNotes(updated);
                                    localStorage.setItem('user_quick_notes', JSON.stringify(updated));
                                }
                            }}
                            className="px-3 py-2 text-sm font-bold bg-white border border-amber-200 border-l-0 shadow-sm rounded-r-lg text-amber-900/40 hover:text-white hover:bg-red-500 hover:border-red-500 transition-colors z-10 cursor-pointer"
                            title="刪除"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-200">
                {isAdding ? (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <input
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="輸入常用詞..."
                            className="px-3 py-1.5 text-sm border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                        />
                        <button
                            type="button"
                            onClick={handleAddNote}
                            className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-deep transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="p-1.5 bg-secondary text-foreground/50 rounded-lg hover:bg-secondary-dark transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 text-sm font-bold text-primary border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 hover:border-primary transition-all active:scale-95 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        新增常用
                    </button>
                )}
            </div>
        </div>
    );
}
