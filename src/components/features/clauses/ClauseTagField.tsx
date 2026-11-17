import { useState } from 'react';
import { Tag, Plus } from 'lucide-react';

interface ClauseTagFieldProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

/** 條文編輯視窗的標籤輸入區：Enter 或按「新增」加入，× 移除，重複標籤忽略 */
export function ClauseTagField({ tags, onChange }: ClauseTagFieldProps) {
    const [tagInput, setTagInput] = useState('');

    const addTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
            setTagInput('');
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                標籤管理
            </label>
            <div className="flex gap-2">
                <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                    placeholder="例如：現況、違約、交屋"
                />
                <button
                    type="button"
                    onClick={addTag}
                    disabled={!tagInput.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    新增
                </button>
            </div>
            <div className="min-h-[40px] bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map(t => (
                            <span key={t} className="bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-shadow">
                                #{t}
                                <button
                                    type="button"
                                    onClick={() => onChange(tags.filter(tag => tag !== t))}
                                    className="hover:text-rose-500 text-emerald-400 hover:scale-110 transition-all"
                                    title="移除標籤"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-slate-400 italic flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        尚未新增標籤
                    </div>
                )}
            </div>
        </div>
    );
}
