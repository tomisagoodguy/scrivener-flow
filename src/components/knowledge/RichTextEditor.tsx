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
import { ResizableImage } from './editor/ResizableImageExtension';
import Link from '@tiptap/extension-link';
import { useState, useEffect, useRef } from 'react';
import 'tippy.js/dist/tippy.css';
import { EditorToolbar } from './editor/EditorToolbar';
import { EditorStyles } from './editor/EditorStyles';
import { uploadImageAndInsert } from './editor/useImageUpload';
import { configureSlashCommand } from './editor/slash-command';

import { EditorBubbleMenu } from './editor/EditorBubbleMenu';
import { DragHandleMenu } from './editor/drag-handle/DragHandleMenu';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    onSave?: () => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const editorRef = useRef<any>(null);

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
            ResizableImage.configure({
                allowBase64: true,
            }),
            configureSlashCommand(),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-indigo-600 dark:text-indigo-400 font-bold underline cursor-pointer hover:text-indigo-500',
                },
            }),
            GlobalDragHandle.configure({
                dragHandleWidth: 20,
                scrollTreshold: 100,
            }),
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            // Mitigate flushSync warning by deferring state update
            requestAnimationFrame(() => {
                onChange(editor.getHTML());
            });
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 text-slate-900 dark:text-slate-100',
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (editorRef.current) {
                        uploadImageAndInsert(file, editorRef.current);
                    }
                    return true;
                }
                return false;
            },
        },
    });

    useEffect(() => {
        if (editor) {
            editorRef.current = editor;
        }
    }, [editor]);

    // Sync active note content when switching tabs
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full ${isFullScreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
            <EditorStyles />
            <EditorToolbar
                editor={editor}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
            />
            {editor && <EditorBubbleMenu editor={editor} />}
            {editor && <DragHandleMenu editor={editor} />}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}
