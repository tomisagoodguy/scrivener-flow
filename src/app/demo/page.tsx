'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DemoCase } from '@/types';
import { DemoHeader } from '@/components/features/demo/DemoHeader';
import { CaseDetailCard } from '@/components/features/demo/CaseDetailCard';
import { DemoCaseTabs } from '@/components/features/demo/DemoCaseTabs';

export default function DemoPage() {
    const supabase = useMemo(() => createClient(), []);
    const [cases, setCases] = useState<DemoCase[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    const fetchCases = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('cases')
                .select(
                    `
          *,
          milestones (*),
          financials (*)
        `
                )
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCases(data as unknown as DemoCase[]);
        } catch (err: any) {
            console.error('Error fetching cases:', err);
            setError(err.message || 'Failed to fetch cases.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
        document.documentElement.setAttribute('data-theme', 'dark');
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const currentCase = cases[selectedIndex];

    const handleAddMockCase = async () => {
        try {
            const { data: caseData, error: caseError } = await supabase
                .from('cases')
                .insert({
                    case_number: `AA${Math.floor(Math.random() * 1000000)}`,
                    status: 'Processing',
                    handler: '子翔',
                    buyer_name: '買方-' + Math.floor(Math.random() * 100),
                    seller_name: '賣方-' + Math.floor(Math.random() * 100),
                    agent_name: '王小明',
                    city: '台北',
                    district: '大安',
                    property_type: 'Building',
                    build_type: 'New_System',
                    today_completion: '新制 (無戶 / 報稅中)',
                    other_notes: '1/20 代償 1/25 塗銷',
                    notes: '一般案件',
                })
                .select()
                .single();

            if (caseError) throw caseError;

            const caseId = caseData.id;
            await supabase.from('milestones').insert({
                case_id: caseId,
                contract_date: '2026-01-01',
                sign_diff_date: '2026-01-03',
                seal_date: '2026-01-15',
                fee_precollect_date: '2026-01-20',
            });

            await supabase.from('financials').insert({
                case_id: caseId,
                total_price: 18500000,
                vat_type: '一般',
                buyer_bank: '華南銀行 (內湖)',
                seller_bank: '第一銀行',
            });

            await fetchCases();
            setSelectedIndex(0);
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const formatDate = (isoStr?: string) => {
        if (!isoStr) return '--';
        if (isoStr.includes('T')) return isoStr.split('T')[0];
        return isoStr;
    };

    return (
        <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
            <DemoHeader
                theme={theme}
                onToggleTheme={toggleTheme}
                onAddCase={handleAddMockCase}
            />

            <main className="flex-1 overflow-auto bg-[var(--background)] p-4 md:p-6 lg:p-8 pb-20">
                {loading ? (
                    <div className="flex items-center justify-center h-full opacity-50 animate-pulse">
                        Loading Workbook...
                    </div>
                ) : !currentCase ? (
                    <div className="text-center py-40 opacity-30 italic">No data found in current sheet.</div>
                ) : (
                    <CaseDetailCard currentCase={currentCase} formatDate={formatDate} />
                )}
            </main>

            <DemoCaseTabs
                cases={cases}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
            />

            <style jsx global>{`
                [data-theme='light'] body {
                    background-color: #e5e7eb;
                }
            `}</style>
        </div>
    );
}
