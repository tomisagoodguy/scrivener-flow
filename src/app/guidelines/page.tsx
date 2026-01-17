'use client';

import React, { useEffect, useState } from 'react';
import { RealEstateGuideline } from '@/data/real_estate_guidelines';
import { Search, Scale, Clock, AlertTriangle, FileText, ChevronRight, Plus, Loader2, User, Building2 } from 'lucide-react';
import { createGuideline, seedGuidelines, getGuidelines } from '../actions/guidelines';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';

export default function GuidelinesPage() {
    const [guidelines, setGuidelines] = useState<RealEstateGuideline[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null); // Format: "role:Buyer" or "scenario:Foreigner"
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const data = await getGuidelines();
                if (data && data.length > 0) {
                    setGuidelines(data);
                } else {
                    await seedGuidelines();
                    const newData = await getGuidelines();
                    setGuidelines(newData || []);
                }
            } catch (err) {
                console.error("Failed to load guidelines", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleCreate = async (data: Omit<RealEstateGuideline, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
        await createGuideline(data);
        const newData = await getGuidelines();
        setGuidelines(newData || []);
    };

    // Construct Sidebar Statistics
    const roles = Array.from(new Set(guidelines.map(g => g.role)));
    // Get scenarios and count frequency
    const scenarioCounts = guidelines.reduce((acc, curr) => {
        acc[curr.scenario] = (acc[curr.scenario] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topScenarios = Object.entries(scenarioCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10) // Top 10 scenarios
        .map(([name]) => name);

    const sidebarGroups: SidebarGroup[] = [
        {
            title: "按角色瀏覽",
            items: roles.map(role => ({
                id: `role:${role}`,
                label: role,
                count: guidelines.filter(g => g.role === role).length,
                icon: role.includes('買方') ? <User className="w-4 h-4" /> :
                    role.includes('賣方') ? <User className="w-4 h-4" /> :
                        role.includes('代書') ? <FileText className="w-4 h-4" /> : <Building2 className="w-4 h-4" />
            }))
        },
        // Only show scenarios group if we have enough data to make it useful
        ...(topScenarios.length > 0 ? [{
            title: "熱門情境",
            items: topScenarios.map(scenario => ({
                id: `scenario:${scenario}`,
                label: scenario,
                count: scenarioCounts[scenario],
                icon: <Scale className="w-4 h-4" />
            }))
        }] : [])
    ];

    const filteredGuidelines = guidelines.filter(item => {
        const matchesSearch =
            item.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.legal_info && item.legal_info.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        if (selectedFilter) {
            const [type, value] = selectedFilter.split(':');
            if (type === 'role') return item.role === value;
            if (type === 'scenario') return item.scenario === value;
        }

        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            <PageSidebar
                title="指南目錄"
                groups={sidebarGroups}
                selectedId={selectedFilter}
                onSelect={setSelectedFilter}
                className="hidden md:block shadow-sm z-10"
            />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
                <div className="max-w-5xl mx-auto space-y-8 pb-20">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <span className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
                                    🧭
                                </span>
                                辦案指南
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                                收錄監護宣告、外國人購屋、公司法人等特殊交易情境的注意事項與條款。
                            </p>

                            <div className="flex items-center gap-2 mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    全團隊共用資料庫・即時同步
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="搜尋關鍵字..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 shadow-sm transition-all"
                                />
                            </div>

                            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 border border-slate-700/50">
                                        <Plus className="w-4 h-4 mr-2" />
                                        新增
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold">新增辦案指南</DialogTitle>
                                    </DialogHeader>
                                    <AddGuidelineForm onSubmit={(data) => {
                                        handleCreate(data);
                                        setIsAddModalOpen(false);
                                    }} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Active Filter Display for Mobile (since sidebar is hidden) or just general status */}
                    {selectedFilter && (
                        <div className="md:hidden flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold">
                            <span>當前篩選: {selectedFilter.split(':')[1]}</span>
                            <button onClick={() => setSelectedFilter(null)} className="ml-auto text-blue-400 hover:text-blue-700">清除</button>
                        </div>
                    )}

                    {/* Content Grid */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : filteredGuidelines.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">沒有找到相關指南</h3>
                            <p className="text-slate-500 mt-2">試試看其他關鍵字，或是新增一筆資料</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredGuidelines.map(item => (
                                <GuidelineCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function AddGuidelineForm({ onSubmit }: { onSubmit: (data: any) => void }) {
    const [formData, setFormData] = useState({
        role: '買方',
        scenario: '',
        legal_info: '',
        required_docs: '',
        processing_time: '',
        special_clauses: '',
        caution: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="role" className="text-base font-bold text-slate-700">角色對象</Label>
                    <Input id="role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="例如：買方、賣方" required className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="scenario" className="text-base font-bold text-slate-700">情境類別</Label>
                    <Input id="scenario" value={formData.scenario} onChange={e => setFormData({ ...formData, scenario: e.target.value })} placeholder="例如：外國人購屋" required className="h-12 text-base" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="legal" className="text-base font-bold text-slate-700">法規須知</Label>
                <Textarea
                    id="legal"
                    value={formData.legal_info}
                    onChange={e => setFormData({ ...formData, legal_info: e.target.value })}
                    placeholder="請輸入相關法條或規定..."
                    className="min-h-[200px] text-base leading-relaxed p-4"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="docs" className="text-base font-bold text-slate-700">應備文件</Label>
                <Textarea
                    id="docs"
                    value={formData.required_docs}
                    onChange={e => setFormData({ ...formData, required_docs: e.target.value })}
                    placeholder="請條列出需要準備的文件項目..."
                    className="min-h-[150px] text-base leading-relaxed p-4"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="special_clauses" className="text-base font-bold text-slate-700">特約條款參考</Label>
                <Textarea
                    id="special_clauses"
                    value={formData.special_clauses}
                    onChange={e => setFormData({ ...formData, special_clauses: e.target.value })}
                    placeholder="請輸入建議的特約條款內文..."
                    className="min-h-[100px] text-base leading-relaxed p-4"
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="time" className="text-base font-bold text-slate-700">作業時間</Label>
                    <Input id="time" value={formData.processing_time} onChange={e => setFormData({ ...formData, processing_time: e.target.value })} placeholder="例如：7-14 個工作天" className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="caution" className="text-base font-bold text-slate-700">特別注意</Label>
                    <Input id="caution" value={formData.caution} onChange={e => setFormData({ ...formData, caution: e.target.value })} placeholder="重要提醒事項..." className="h-12 text-base" />
                </div>
            </div>

            <DialogFooter className="pt-4">
                <Button type="submit" size="lg" className="w-full sm:w-auto text-base px-8">確認新增</Button>
            </DialogFooter>
        </form>
    );
}

function GuidelineCard({ item }: { item: RealEstateGuideline }) {
    // Generate a deterministic hash for the ID based on content to ensure hydration match
    const seed = item.role + item.scenario;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const scenarioId = `SC-${Math.abs(hash).toString().substring(0, 6)}`;

    return (
        <div className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent opacity-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${item.role === '買方' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                item.role === '賣方' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    'bg-purple-50 text-purple-600 border-purple-100'
                                }`}>
                                {item.role}
                            </span>
                            <span className="text-slate-400 text-xs font-mono">
                                #{scenarioId}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                            {item.scenario}
                            <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    <div className="space-y-4">
                        {item.legal_info && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-colors">
                                <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
                                    <Scale className="w-4 h-4 text-blue-500" />
                                    法規須知
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.legal_info}</p>
                            </div>
                        )}

                        {item.special_clauses && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2 text-amber-900 font-bold mb-2">
                                    <FileText className="w-4 h-4 text-amber-600" />
                                    特約條款參考
                                </div>
                                <code className="text-xs text-amber-800 bg-white/50 px-2 py-1 rounded block mt-1 font-mono whitespace-pre-line">
                                    {item.special_clauses}
                                </code>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {item.required_docs && (
                            <div className="flex gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg h-fit text-indigo-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 mb-1">應備文件</h4>
                                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                        {item.required_docs}
                                    </div>
                                </div>
                            </div>
                        )}

                        {item.processing_time && (
                            <div className="flex gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg h-fit text-emerald-600">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 mb-1">作業時間</h4>
                                    <p className="text-sm text-slate-600">{item.processing_time}</p>
                                </div>
                            </div>
                        )}

                        {item.caution && (
                            <div className="flex gap-3">
                                <div className="p-2 bg-rose-50 rounded-lg h-fit text-rose-600">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 mb-1">特別注意</h4>
                                    <p className="text-sm text-slate-600">{item.caution}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
