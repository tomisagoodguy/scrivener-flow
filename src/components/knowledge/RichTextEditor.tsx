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
import Highlight from '@tiptap/extension-highlight';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Heading1, Heading2,
    CheckSquare, Code, Minus, Table as TableIcon,
    Maximize2, Minimize2, Sparkles, Loader2, Highlighter
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { optimizeTextContent } from '@/app/actions/ai';
import { toast } from 'sonner';

const MenuBar = ({ editor }: { editor: any }) => {
    const [isOptimizing, setIsOptimizing] = useState(false);

    const handleAIOptimize = async (type: 'grammar' | 'expand' | 'summarize' | 'structure') => {
        const selection = editor.state.selection;
        // Use HTML to preserve tables and structure when sending to AI
        const contentToOptimize = selection.empty ? editor.getHTML() : editor.state.doc.textBetween(selection.from, selection.to, ' ');

        if (!contentToOptimize || (selection.empty && contentToOptimize === '<p></p>') || (!selection.empty && contentToOptimize.length < 5)) {
            toast.error('請先輸入或選取足夠的文字');
            return;
        }

        setIsOptimizing(true);
        try {
            const result = await optimizeTextContent(contentToOptimize, type);
            if (result.success && result.data) {
                // If text selected, replace selection. If not, append or replace?
                // Let's adopt a safe approach: Copy to clipboard or ask user? 
                // Better: If selection, replace. If no selection (whole doc), verify user intention? 
                // Let's just append for safety if full doc, replace if selection.

                if (!selection.empty) {
                    // Extract HTML from code blocks if AI wrapped it
                    let cleanData = result.data;
                    if (cleanData.includes('```html')) {
                        cleanData = cleanData.match(/```html([\s\S]*?)```/)?.[1] || cleanData;
                    } else if (cleanData.includes('```')) {
                        cleanData = cleanData.match(/```([\s\S]*?)```/)?.[1] || cleanData;
                    }
                    editor.chain().focus().insertContent(cleanData.trim()).run();
                    toast.success('AI 優化完成');
                } else {
                    let cleanData = result.data;
                    if (cleanData.includes('```html')) {
                        cleanData = cleanData.match(/```html([\s\S]*?)```/)?.[1] || cleanData;
                    } else if (cleanData.includes('```')) {
                        cleanData = cleanData.match(/```([\s\S]*?)```/)?.[1] || cleanData;
                    }
                    // For simplicity in this iteration: Insert at cursor
                    editor.chain().focus().insertContent(`<br><br><div style="border-left: 4px solid #6366f1; padding-left: 1rem; margin: 1rem 0;"><strong>--- AI 優化建議 ---</strong><br>${cleanData.trim()}</div><br>`).run();
                    toast.success('AI 建議已附加於下方');
                }
            } else {
                toast.error(result.message || 'AI 服務暫時無法使用');
            }
        } catch (e) {
            toast.error('發生錯誤');
        } finally {
            setIsOptimizing(false);
        }
    };

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
            <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${editor.isActive('highlight') ? 'bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100' : 'text-slate-600 dark:text-slate-400'
                    }`}
                title="螢光筆 (畫重點)"
            >
                <Highlighter size={18} />
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
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
            <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 rounded p-1 border border-indigo-100 dark:border-indigo-800">
                <Sparkles size={14} className="text-indigo-500 ml-1" />
                <button
                    onClick={() => handleAIOptimize('grammar')}
                    disabled={isOptimizing}
                    className="px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded disabled:opacity-50"
                >
                    {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : '潤飾'}
                </button>
                <button
                    onClick={() => handleAIOptimize('expand')}
                    disabled={isOptimizing}
                    className="px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded disabled:opacity-50"
                >
                    擴充
                </button>
                <button
                    onClick={() => handleAIOptimize('summarize')}
                    disabled={isOptimizing}
                    className="px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded disabled:opacity-50"
                >
                    摘要
                </button>
                <button
                    onClick={() => handleAIOptimize('structure')}
                    disabled={isOptimizing}
                    className="px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded disabled:opacity-50"
                >
                    整理
                </button>
            </div>
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
            Highlight.configure({
                multicolor: true,
            }),
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
            .ProseMirror mark {
                background-color: #fef08a;
                border-radius: 0.25rem;
                padding: 0.125rem 0.25rem;
                box-decoration-break: clone;
            }
            .dark .ProseMirror mark {
                background-color: #854d0e;
                color: #fef9c3;
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
