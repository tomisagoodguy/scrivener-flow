'use client';

import React, { useEffect, useState } from 'react';
import { RealEstateGuideline } from '@/data/real_estate_guidelines';
import { Search, Scale, FileText, Plus, Loader2, User, Building2 } from 'lucide-react';
import { createGuideline, seedGuidelines, getGuidelines } from '../actions/guidelines';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PageSidebar, SidebarGroup } from '@/components/shared/PageSidebar';
import { AddGuidelineForm } from '@/components/features/guidelines/AddGuidelineForm';
import { GuidelineCard } from '@/components/features/guidelines/GuidelineCard';

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
            <PageSidebar
                title="指南目錄"
                groups={sidebarGroups}
                selectedId={selectedFilter}
                onSelect={setSelectedFilter}
                className="hidden md:block shadow-sm z-10"
            />

            <main className="flex-1 p-6 md:p-12">
                <div className="max-w-5xl mx-auto space-y-8 pb-20">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
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

                    {/* Active Filter Display for Mobile */}
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
