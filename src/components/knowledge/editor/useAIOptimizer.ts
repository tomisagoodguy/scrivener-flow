import { useState } from 'react';
import { toast } from 'sonner';
import { optimizeTextContent } from '@/app/actions/ai';
import { Editor } from '@tiptap/react';

export function useAIOptimizer(editor: Editor | null) {
    const [isOptimizing, setIsOptimizing] = useState(false);

    const handleAIOptimize = async (type: 'grammar' | 'expand' | 'summarize' | 'structure') => {
        if (!editor) return;

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
                const getCleanHtml = (data: string) => {
                    let clean = data;
                    if (clean.includes('```html')) {
                        clean = clean.match(/```html([\s\S]*?)```/)?.[1] || clean;
                    } else if (clean.includes('```')) {
                        clean = clean.match(/```([\s\S]*?)```/)?.[1] || clean;
                    }
                    // Remove excessive empty tags and duplicate breaks that make it "gappy"
                    return clean
                        .replace(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/g, '<li>$1</li>') // flatten li > p
                        .replace(/<p>\s*<\/p>/g, '') // remove empty paragraphs
                        .replace(/(<br\s*\/?>\s*){2,}/g, '<br>') // collapse multiple breaks
                        .trim();
                };

                const cleanData = getCleanHtml(result.data);

                if (!selection.empty) {
                    editor.chain().focus().insertContent(cleanData).run();
                    toast.success('AI 優化完成');
                } else {
                    editor.chain().focus().insertContent(`<br><div style="border-left: 4px solid #6366f1; padding-left: 1rem; margin: 0.5rem 0;"><strong>--- AI 優化建議 ---</strong><br>${cleanData}</div>`).run();
                    toast.success('AI 建議已附加於下方');
                }
            } else {
                toast.error(result.message || 'AI 服務暫時無法使用');
            }
        } catch (e) {
            toast.error('發生錯誤');
            console.error(e);
        } finally {
            setIsOptimizing(false);
        }
    };

    return {
        isOptimizing,
        handleAIOptimize
    };
}
