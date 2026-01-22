import { Editor } from '@tiptap/react';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Heading1, Heading2,
    CheckSquare, Code, Minus, Table as TableIcon,
    Sparkles, Loader2, Highlighter, Maximize2, Minimize2
} from 'lucide-react';
import { useAIOptimizer } from './useAIOptimizer';

interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    icon: React.ReactNode;
    title: string;
    className?: string; // Additional classes
}

const ToolbarButton = ({ onClick, active, disabled, icon, title, className = "" }: ToolbarButtonProps) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${active
            ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
            : 'text-slate-600 dark:text-slate-400'
            } ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`}
        title={title}
    >
        {icon}
    </button>
);

const Divider = () => <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />;

interface EditorToolbarProps {
    editor: Editor | null;
    isFullScreen?: boolean;
    onToggleFullScreen?: () => void;
}

export function EditorToolbar({ editor, isFullScreen, onToggleFullScreen }: EditorToolbarProps) {
    const { isOptimizing, handleAIOptimize } = useAIOptimizer(editor);

    if (!editor) return null;

    return (
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 pr-2 transition-colors">
            <div className="flex-1 overflow-x-auto">
                <div className="p-2 flex flex-wrap gap-2 sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        disabled={!editor.can().chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        icon={<Bold size={18} />}
                        title="粗體"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        disabled={!editor.can().chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        icon={<Italic size={18} />}
                        title="斜體"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        icon={<UnderlineIcon size={18} />}
                        title="底線"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        icon={<Strikethrough size={18} />}
                        title="刪除線"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        active={editor.isActive('code')}
                        icon={<Code size={18} />}
                        title="行內程式碼"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        active={editor.isActive('highlight')}
                        icon={<Highlighter size={18} />}
                        title="螢光筆"
                        className={editor.isActive('highlight') ? '!bg-yellow-200 dark:!bg-yellow-900 !text-yellow-900 dark:!text-yellow-100' : ''}
                    />

                    <Divider />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })}
                        icon={<Heading1 size={18} />}
                        title="大標題"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}
                        icon={<Heading2 size={18} />}
                        title="中標題"
                    />

                    <Divider />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        icon={<List size={18} />}
                        title="項目符號列表"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        icon={<ListOrdered size={18} />}
                        title="編號列表"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        active={editor.isActive('taskList')}
                        icon={<CheckSquare size={18} />}
                        title="待辦清單"
                    />

                    <Divider />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        active={editor.isActive('blockquote')}
                        icon={<Quote size={18} />}
                        title="引用"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        icon={<Minus size={18} />}
                        title="分隔線"
                    />

                    <Divider />

                    {/* Table Controls */}
                    <ToolbarButton
                        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                        active={editor.isActive('table')}
                        icon={<TableIcon size={18} />}
                        title="插入表格 (3x3)"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        disabled={!editor.isActive('table')}
                        icon={<TableIcon size={18} className="rotate-45" />}
                        title="刪除表格"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        disabled={!editor.isActive('table')}
                        icon={<TableIcon size={18} className="rotate-90" />}
                        title="在下方插入行"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteRow().run()}
                        disabled={!editor.isActive('table')}
                        icon={<TableIcon size={18} className="-rotate-90" />}
                        title="刪除行"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        disabled={!editor.isActive('table')}
                        icon={<TableIcon size={18} className="scale-x-[-1]" />}
                        title="在右方插入列"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteColumn().run()}
                        disabled={!editor.isActive('table')}
                        icon={<TableIcon size={18} />}
                        title="刪除列"
                    />

                    <Divider />

                    {/* AI Tools */}
                    <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 rounded p-1 border border-indigo-100 dark:border-indigo-800">
                        <Sparkles size={14} className="text-indigo-500 ml-1" />
                        <AIOptionButton onClick={() => handleAIOptimize('grammar')} loading={isOptimizing} label="潤飾" />
                        <AIOptionButton onClick={() => handleAIOptimize('expand')} loading={isOptimizing} label="擴充" />
                        <AIOptionButton onClick={() => handleAIOptimize('summarize')} loading={isOptimizing} label="摘要" />
                        <AIOptionButton onClick={() => handleAIOptimize('structure')} loading={isOptimizing} label="整理" />
                    </div>
                </div>
            </div>

            {onToggleFullScreen && (
                <button
                    onClick={onToggleFullScreen}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            )}
        </div>
    );
}

const AIOptionButton = ({ onClick, loading, label }: { onClick: () => void, loading: boolean, label: string }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded disabled:opacity-50 min-w-[40px] flex justify-center"
    >
        {loading ? <Loader2 size={12} className="animate-spin" /> : label}
    </button>
);
