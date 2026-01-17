'use client';

import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Eye, MessageCircle, Heart, Tag } from 'lucide-react';

export interface TeamNote {
    id: string;
    title: string;
    content: string;
    category: '經驗分享' | '最佳實踐' | '常見問題' | '法規更新' | '其他';
    tags: string[];
    author_id: string;
    author_name?: string; // 從 JOIN 查詢獲得
    created_at: string;
    updated_at: string;
    is_pinned: boolean;
    view_count: number;
    like_count: number;
    comment_count?: number; // 從 JOIN 查詢獲得
}

interface NoteCardProps {
    note: TeamNote;
    onClick?: () => void;
}

const categoryColors = {
    '經驗分享': 'bg-green-100 text-green-700',
    '最佳實踐': 'bg-orange-100 text-orange-700',
    '常見問題': 'bg-blue-100 text-blue-700',
    '法規更新': 'bg-purple-100 text-purple-700',
    '其他': 'bg-gray-100 text-gray-700',
};

const categoryIcons = {
    '經驗分享': '💡',
    '最佳實踐': '⭐',
    '常見問題': '❓',
    '法規更新': '📜',
    '其他': '📋',
};

export default function NoteCard({ note, onClick }: NoteCardProps) {
    // Helper function to strip HTML tags for summary
    const stripHtml = (html: string) => {
        if (!html) return '';
        return html.replace(/<[^>]*>?/gm, '');
    };

    const rawContent = stripHtml(note.content || '');

    // Summary: ~200 characters for a blog feel
    const summary = rawContent
        ? rawContent.substring(0, 200) + (rawContent.length > 200 ? '...' : '')
        : '無內容';

    const formattedDate = format(new Date(note.created_at), 'yyyy 年 M 月 d 日', { locale: zhTW });

    return (
        <article
            onClick={onClick}
            className="group relative bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Decorative gradient blob on hover */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                {/* Meta Header */}
                <div className="flex items-center gap-3 text-sm mb-4">
                    {/* Author Avatar (Initials) */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs ring-2 ring-white">
                        {note.author_name ? note.author_name[0] : 'A'}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-medium text-slate-700">{note.author_name || '匿名'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{formattedDate}</span>
                    </div>

                    <div className="flex-1" />

                    <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 transition-colors ${note.category === '法規更新' ? 'bg-purple-50 text-purple-700' :
                                note.category === '常見問題' ? 'bg-blue-50 text-blue-700' :
                                    'bg-slate-50 text-slate-600'
                            }`}
                    >
                        {categoryIcons[note.category] || categoryIcons['其他']}
                        {note.category}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-extrabold text-slate-900 mb-3 leading-tight group-hover:text-indigo-600 transition-colors">
                    {note.title}
                </h3>

                {/* Summary */}
                <p className="text-slate-600 leading-relaxed mb-6 line-clamp-3">
                    {summary}
                </p>

                {/* Footer / Tags */}
                {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-slate-50 pt-4 mt-auto">
                        <Tag size={14} className="text-slate-400" />
                        <div className="flex flex-wrap gap-2">
                            {note.tags.slice(0, 4).map((tag, index) => (
                                <span
                                    key={index}
                                    className="text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    #{tag}
                                </span>
                            ))}
                            {note.tags.length > 4 && (
                                <span className="text-xs text-slate-400">+{note.tags.length - 4}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}
