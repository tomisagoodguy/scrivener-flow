import { Editor } from '@tiptap/react';
import { Copy, Trash2, GripVertical } from 'lucide-react';
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
        const editorDom = editor.view.dom;
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

    const duplicateNode = () => {
        if (targetNodePos !== null) {
            const node = editor.state.doc.nodeAt(targetNodePos);
            if (node) {
                // Simplified duplicate: set selection and copy-paste behavior manually
                // Or gets JSON and insert
                const json = node.toJSON();
                editor.chain().insertContentAt(targetNodePos + node.nodeSize, json).run();
            }
        }
        tippyInstance.current?.hide();
    };

    const deleteNode = () => {
        if (targetNodePos !== null) {
            const node = editor.state.doc.nodeAt(targetNodePos);
            if (node) {
                editor.chain().deleteRange({ from: targetNodePos, to: targetNodePos + node.nodeSize }).run();
            }
        }
        tippyInstance.current?.hide();
    };

    return (
        <div ref={menuRef} className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg py-1 w-40 flex flex-col z-50 overflow-hidden">
            <button
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-left transition-colors"
                onClick={duplicateNode}
            >
                <Copy size={16} className="text-slate-500" />
                Duplicate
            </button>
            <button
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-left transition-colors"
                onClick={deleteNode}
            >
                <Trash2 size={16} />
                Delete
            </button>
        </div>
    );
};
