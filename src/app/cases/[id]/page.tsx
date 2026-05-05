import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server'; // Use server client for RLS
import EditCaseForm from '@/components/features/cases/EditCaseForm';
import CaseNavigation from '@/components/features/cases/CaseNavigation';
import { CaseDetailRapidInput } from '@/components/features/cases/CaseDetailRapidInput';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: PageProps) {
    const { id } = await params;

    // Initialize authenticated Supabase client for Server Component
    const supabase = await createClient();

    // 1. Fetch current case full details
    const { data: caseData, error } = await supabase
        .from('cases')
        .select(
            `
            *,
            milestones (*),
            financials (*),
            case_date_logs (*),
            todos (*)
        `
        )
        .eq('id', id)
        .single();

    if (error || !caseData) {
        console.error('Error fetching case:', JSON.stringify(error, null, 2));
        notFound();
    }

    // 2. Fetch lightweight list for navigation (Same order as main list: created_at DESC)
    // Implicit RLS ensures users only see their own cases.
    const { data: casesList } = await supabase
        .from('cases')
        .select('id, case_number, buyer_name, seller_name, city, district')
        .neq('status', 'Closed')
        .neq('status', 'Cancelled')
        .order('created_at', { ascending: false });

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-[1600px] mx-auto font-sans">
            <main className="mt-8 transition-all">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in gap-4 md:gap-0">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">編輯案件</h1>
                        <p className="text-foreground/60 mt-2">{caseData.case_number}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <CaseNavigation
                            cases={casesList || []}
                            currentCaseId={caseData.id}
                        />
                    </div>
                </header>

                <div className="mb-4">
                    <CaseDetailRapidInput
                        caseId={caseData.id}
                        caseNumber={caseData.case_number}
                        buyerName={caseData.buyer_name || ''}
                        sellerName={caseData.seller_name || ''}
                    />
                </div>

                <EditCaseForm initialData={caseData as any} />
            </main>
        </div>
    );
}

