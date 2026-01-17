'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, CheckSquare, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="border-b border-slate-200 p-2 flex flex-wrap gap-2 sticky top-0 bg-white z-10">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="Bold"
            >
                <Bold size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="Italic"
            >
                <Italic size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="H1"
            >
                <Heading1 size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="H2"
            >
                <Heading2 size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="Bullet List"
            >
                <List size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="Ordered List"
            >
                <ListOrdered size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('taskList') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="Task List"
            >
                <CheckSquare size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded hover:bg-slate-100 transition-colors ${editor.isActive('blockquote') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'
                    }`}
                title="Quote"
            >
                <Quote size={18} />
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
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
    });

    // Sync initial value if changed externally (though rare in this edit flow)
    // useEffect(() => {
    //     if (editor && value !== editor.getHTML()) {
    //         editor.commands.setContent(value);
    //     }
    // }, [value, editor]);

    return (
        <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col ${isFullScreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
            <div className="flex justify-between items-center bg-white border-b border-slate-200 pr-2">
                <div className="flex-1 overflow-x-auto">
                    <MenuBar editor={editor} />
                </div>
                <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}
