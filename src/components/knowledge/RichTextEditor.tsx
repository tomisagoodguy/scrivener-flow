'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Heading1, Heading2,
    CheckSquare, Code, Minus, Table as TableIcon,
    Maximize2, Minimize2
} from 'lucide-react';
import { useState, useEffect } from 'react';

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    return (

        <div className="border-b border-slate-200 dark:border-slate-700 p-2 flex flex-wrap gap-2 sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="粗體"
            >
                <Bold size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="斜體"
            >
                <Italic size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('underline') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="底線"
            >
                <UnderlineIcon size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('strike') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="刪除線"
            >
                <Strikethrough size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('code') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="行內程式碼"
            >
                <Code size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="大標題"
            >
                <Heading1 size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="中標題"
            >
                <Heading2 size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="項目符號列表"
            >
                <List size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="編號列表"
            >
                <ListOrdered size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('taskList') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="待辦清單"
            >
                <CheckSquare size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('blockquote') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="引用"
            >
                <Quote size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                title="分隔線"
            >
                <Minus size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
            {/* Table Controls */}
            <button
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('table') ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="插入表格 (3x3)"
            >
                <TableIcon size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                disabled={!editor.isActive('table')}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="刪除表格"
            >
                <TableIcon size={18} className="rotate-45" /> {/* Using a rotated table icon for delete */}
            </button>
            <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                disabled={!editor.isActive('table')}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="在下方插入行"
            >
                <TableIcon size={18} className="rotate-90" /> {/* Placeholder for add row icon */}
            </button>
            <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                disabled={!editor.isActive('table')}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="刪除行"
            >
                <TableIcon size={18} className="-rotate-90" /> {/* Placeholder for delete row icon */}
            </button>
            <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                disabled={!editor.isActive('table')}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="在右方插入列"
            >
                <TableIcon size={18} className="scale-x-[-1]" /> {/* Placeholder for add column icon */}
            </button>
            <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                disabled={!editor.isActive('table')}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="刪除列"
            >
                <TableIcon size={18} /> {/* Placeholder for delete column icon */}
            </button>
        </div>
    );
};

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    onSave?: () => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const [isFullScreen, setIsFullScreen] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: '開始輸入內容...',
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Underline,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            // We use Markdown for storage effectively by just saving HTML content,
            // but for now, let's stick to saving HTML which works better with Tiptap.
            // If you need Markdown specifically, we'd need a converter.
            // The previous system used SimpleMDE which gave Markdown.
            // But NoteDetail uses ReactMarkdown to render.
            // If we save HTML, ReactMarkdown won't render it nicely unless we configure it or save as Markdown.
            // For now, let's verify if NoteDetail expects Markdown. 
            // Yes, <ReactMarkdown>{note.content}</ReactMarkdown>
            // So we should try to save as Markdown? Or change NoteDetail to render HTML.
            // Changing NoteDetail to render HTML is easier for WYSIWYG.
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 text-slate-900 dark:text-slate-100',
            },
        },
    });

    // Sync active note content when switching tabs
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    // Add table styles
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .ProseMirror table {
                border-collapse: collapse;
                margin: 1rem 0;
                overflow: hidden;
                table-layout: fixed;
                width: 100%;
            }
            .ProseMirror td,
            .ProseMirror th {
                border: 2px solid #334155;
                box-sizing: border-box;
                min-width: 1em;
                padding: 6px 8px;
                position: relative;
                vertical-align: top;
            }
            .ProseMirror th {
                background-color: #f1f5f9;
                font-weight: bold;
                text-align: left;
            }
            .dark .ProseMirror th {
                background-color: #1e293b;
            }
            .ProseMirror .selectedCell:after {
                background: rgba(59, 130, 246, 0.1);
                content: "";
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                pointer-events: none;
                position: absolute;
                z-index: 2;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full ${isFullScreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 pr-2 transition-colors">
                <div className="flex-1 overflow-x-auto">
                    <MenuBar editor={editor} />
                </div>
                <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}
