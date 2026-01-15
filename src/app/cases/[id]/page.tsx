
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server'; // Use server client for RLS
import EditCaseForm from '@/components/EditCaseForm';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: PageProps) {
    const { id } = await params;

    // Initialize authenticated Supabase client for Server Component
    const supabase = await createClient();

    const { data: caseData, error } = await supabase
        .from('cases')
        .select(`
            *,
            milestones (*),
            financials (*),
            case_date_logs (*)
        `)
        .eq('id', id)
        .single();

    if (error || !caseData) {
        console.error('Error fetching case:', JSON.stringify(error, null, 2));
        notFound();
    }

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-[1600px] mx-auto font-sans">
            <main className="mt-8 transition-all">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                            編輯案件
                        </h1>
                        <p className="text-foreground/60 mt-2">{caseData.case_number}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* GoogleCalendarSyncButton removed */}
                        <Link href="/cases" className="bg-secondary px-4 py-2 rounded text-sm text-foreground hover:bg-surface-hover transition-colors">
                            ← 返回列表
                        </Link>
                    </div>
                </header>

                <EditCaseForm initialData={caseData as any} />
            </main>
        </div>
    );
}
