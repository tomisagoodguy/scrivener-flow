import { BubbleMenu, Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Link, Code, Highlighter } from 'lucide-react';
import { useCallback, useState } from 'react';

interface EditorBubbleMenuProps {
    editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href;
        setLinkUrl(previousUrl || '');
        setIsLinkOpen(true);
    }, [editor]);

    const applyLink = useCallback(() => {
        if (linkUrl) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
        } else {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        }
        setIsLinkOpen(false);
    }, [editor, linkUrl]);

    if (!editor) {
        return null;
    }

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700"
        >
            {isLinkOpen ? (
                <div className="flex items-center gap-2 px-2">
                    <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="text-sm border-none outline-none bg-transparent w-40 text-slate-700 dark:text-slate-200"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                applyLink();
                            }
                        }}
                        autoFocus
                    />
                    <button onClick={applyLink} className="text-xs font-bold text-indigo-600">
                        Apply
                    </button>
                    <button onClick={() => setIsLinkOpen(false)} className="text-xs text-slate-500">
                        Close
                    </button>
                </div>
            ) : (
                <>
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${editor.isActive('bold') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        title="Bold"
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${editor.isActive('italic') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        title="Italic"
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${editor.isActive('strike') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        title="Strikethrough"
                    >
                        <Strikethrough size={16} />
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button
                        onClick={setLink}
                        className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${editor.isActive('link') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        title="Link"
                    >
                        <Link size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${editor.isActive('code') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        title="Inline Code"
                    >
                        <Code size={16} />
                    </button>
                </>
            )}
        </BubbleMenu>
    );
}
