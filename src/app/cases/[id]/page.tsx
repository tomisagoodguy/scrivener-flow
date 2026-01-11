
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Case } from '@/types';
import EditCaseForm from '@/components/EditCaseForm';
import { Header } from '@/components/Header';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: PageProps) {
    const { id } = await params;

    const { data: caseData, error } = await supabase
        .from('cases')
        .select(`
            *,
            milestones (*),
            financials (*)
        `)
        .eq('id', id)
        .single();

    if (error || !caseData) {
        console.error('Error fetching case:', error);
        notFound();
    }

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto font-sans">
            <Header />

            <main className="mt-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                            編輯案件
                        </h1>
                        <p className="text-foreground/60 mt-2">{caseData.case_number}</p>
                    </div>
                    <Link href="/cases" className="bg-secondary px-4 py-2 rounded text-sm text-foreground hover:bg-surface-hover transition-colors">
                        ← 返回列表
                    </Link>
                </header>

                <EditCaseForm initialData={caseData as Case} />
            </main>
        </div>
    );
}
