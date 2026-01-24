import { Editor } from '@tiptap/react';
import { GripVertical, Plus, Trash2, Copy } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import tippy, { Instance, Props } from 'tippy.js';

interface DragHandleProps {
    editor: Editor;
}

export const DragHandle = ({ editor }: DragHandleProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const dragHandleRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [currentNodePos, setCurrentNodePos] = useState<number | null>(null);

    useEffect(() => {
        if (!editor || !dragHandleRef.current) return;

        const sidebarWidth = 240; // Approx sidebar width or padding offset
        const contentWidth = 800; // Approx content width
        // In a real implementation this should be dynamic

        const updatePosition = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            // Simple implementation: Show handle next to current selection
            // A robust version requires mapping coordinates to Tiptap nodes

            // For now, we'll use a simplified logic: if mouse hovers a block
            // We need to attach a mouseover listener to the editor element
        };

        const handleMouseMove = (event: MouseEvent) => {
            const editorElement = editor.view.dom;
            const rect = editorElement.getBoundingClientRect();

            // Check if mouse is within editor vertical bounds
            if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
                // Check if mouse is near the left edge or on a block
                const coords = { left: event.clientX, top: event.clientY };
                const pos = editor.view.posAtCoords(coords);

                if (pos) {
                    const node = editor.view.domAtPos(pos.pos).node as HTMLElement;
                    const blockNode = findBlockNode(node, editorElement);

                    if (blockNode) {
                        const blockRect = blockNode.getBoundingClientRect();
                        // Position handle to the left of the block
                        const top = blockRect.top + window.scrollY;
                        const left = blockRect.left - 24; // 24px gutter

                        setPosition({ top: top - window.scrollY, left: left });

                        // Store the node pos for operations
                        setCurrentNodePos(pos.pos);
                    }
                }
            }
        };

        // Helper to find the immediate child of the editor (the block)
        const findBlockNode = (node: HTMLElement | Node, root: HTMLElement): HTMLElement | null => {
            let current = node;
            while (current && current.parentElement !== root && current.parentElement) {
                current = current.parentElement;
            }
            return current === root ? null : (current as HTMLElement);
        };

        // Attach to window specifically for demo purposes, better to attach to editor wrapper
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };

    }, [editor]);

    if (!position) return null;

    return (
        <div
            ref={dragHandleRef}
            className="fixed z-50 flex items-center justify-center w-6 h-6 rounded cursor-grab hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            style={{
                top: position.top,
                left: position.left,
                transform: 'translateY(2px)' // Small alignment adjustment
            }}
            draggable="true"
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                // Drag start logic
                // Currently just a visual handle for menu
            }}
            onClick={() => setMenuOpen(!menuOpen)}
        >
            <GripVertical size={18} />

            {/* Context Menu */}
            {menuOpen && (
                <div className="absolute top-6 left-0 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-md py-1 w-32 flex flex-col z-50">
                    <button
                        className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-left"
                        onClick={() => {
                            // Delete logic
                            if (currentNodePos !== null) {
                                // Find the node range and delete
                                // Simplified for demo
                            }
                            setMenuOpen(false);
                        }}
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                    <button
                        className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-left"
                        onClick={() => {
                            setMenuOpen(false);
                        }}
                    >
                        <Copy size={14} />
                        Duplicate
                    </button>
                </div>
            )}
        </div>
    );
};
