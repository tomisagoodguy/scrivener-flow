import { Editor } from '@tiptap/react';
import { Copy, Trash2, GripVertical, Heading1, Heading2, List, ListOrdered, Quote, Type, CheckSquare } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import tippy, { Instance } from 'tippy.js';

interface DragHandleMenuProps {
    editor: Editor;
}

export const DragHandleMenu = ({ editor }: DragHandleMenuProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [targetNodePos, setTargetNodePos] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const tippyInstance = useRef<Instance | null>(null);

    useEffect(() => {
        if (!editor) return;

        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Check if clicked element is our drag handle (from extension)
            if (target.classList.contains('drag-handle')) {
                e.preventDefault();
                e.stopPropagation();

                // Find the position content relative to the handle
                // The extension places handle absolute. We can find the node by coordinates slightly to the right
                const rect = target.getBoundingClientRect();
                const pos = editor.view.posAtCoords({
                    left: rect.right + 10,
                    top: rect.top + (rect.height / 2)
                });

                if (pos) {
                    setTargetNodePos(pos.pos);
                    setMenuOpen(true);

                    // Show menu at handle position
                    if (menuRef.current) {
                        if (tippyInstance.current) tippyInstance.current.destroy();

                        tippyInstance.current = tippy(target, {
                            content: menuRef.current,
                            placement: 'bottom-start',
                            trigger: 'manual',
                            interactive: true,
                            appendTo: document.body,
                            maxWidth: 300,
                            offset: [0, 10],
                            onClickOutside: () => {
                                setMenuOpen(false);
                            },
                            onHidden: () => {
                                setMenuOpen(false);
                            }
                        });
                        tippyInstance.current.show();
                    }
                }
            }
        };

        // Attach listener to editor element properly
        // The handle is appended to the editor logic shell usually, but actually strictly it might be best to listen on document
        // because the handle might be outside the editor content editable div depending on implementation.
        // The extension appends drag-handle usually as a sibling or child of the block.

        // We use capture to intercept the click before it might do other things
        document.addEventListener('click', handleGlobalClick, true);

        return () => {
            document.removeEventListener('click', handleGlobalClick, true);
            if (tippyInstance.current) tippyInstance.current.destroy();
        };
    }, [editor]);

    if (!menuOpen) return <div ref={menuRef} className="hidden" />;

    const runCommand = (fn: (chain: any) => any) => {
        if (targetNodePos !== null) {
            // Use the editor's state to resolve the position
            const $pos = editor.state.doc.resolve(targetNodePos);

            // Find the start and end of the current block (depth 1 for top-level blocks)
            // This ensures we select the entire paragraph/heading correctly
            const start = $pos.before(1);
            const end = $pos.after(1);

            // Focus first, then set selection, then run the requested command
            const chain = editor.chain().focus().setTextSelection({ from: start, to: end });
            fn(chain).run();
        }
        tippyInstance.current?.hide();
        setMenuOpen(false);
    };

    const duplicateNode = () => {
        if (targetNodePos !== null) {
            const $pos = editor.state.doc.resolve(targetNodePos);
            const start = $pos.before(1);
            const end = $pos.after(1);
            const content = editor.state.doc.slice(start, end).content;

            editor.chain().focus().insertContentAt(end, content).run();
        }
        tippyInstance.current?.hide();
        setMenuOpen(false);
    };

    const deleteNode = () => {
        if (targetNodePos !== null) {
            const $pos = editor.state.doc.resolve(targetNodePos);
            const start = $pos.before(1);
            const end = $pos.after(1);
            editor.chain().focus().deleteRange({ from: start, to: end }).run();
        }
        tippyInstance.current?.hide();
        setMenuOpen(false);
    };

    return (
        <div ref={menuRef} className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg py-1 w-48 flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 mb-1">
                Turn Into
            </div>

            <button className="menu-item" onClick={() => runCommand((c) => c.setParagraph())}>
                <Type size={16} className="mr-2" /> Text
            </button>
            <button className="menu-item" onClick={() => runCommand((c) => c.toggleHeading({ level: 1 }))}>
                <Heading1 size={16} className="mr-2" /> Heading 1
            </button>
            <button className="menu-item" onClick={() => runCommand((c) => c.toggleHeading({ level: 2 }))}>
                <Heading2 size={16} className="mr-2" /> Heading 2
            </button>
            <button className="menu-item" onClick={() => runCommand((c) => c.toggleBulletList())}>
                <List size={16} className="mr-2" /> Bullet List
            </button>
            <button className="menu-item" onClick={() => runCommand((c) => c.toggleOrderedList())}>
                <ListOrdered size={16} className="mr-2" /> Numbered List
            </button>
            <button className="menu-item" onClick={() => runCommand((c) => c.toggleBlockquote())}>
                <Quote size={16} className="mr-2" /> Quote
            </button>

            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

            <button className="menu-item" onClick={duplicateNode}>
                <Copy size={16} className="mr-2" /> Duplicate
            </button>
            <button className="menu-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={deleteNode}>
                <Trash2 size={16} className="mr-2" /> Delete
            </button>

            <style jsx>{`
                .menu-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    color: #334155;
                    text-align: left;
                    transition: background-color 0.1s;
                }
                .dark .menu-item {
                    color: #e2e8f0;
                }
                .menu-item:hover {
                    background-color: #f1f5f9;
                }
                .dark .menu-item:hover {
                    background-color: #1e293b;
                }
            `}</style>
        </div>
    );
};
