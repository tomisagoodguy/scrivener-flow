import { createClient } from '@/lib/supabase/server';
import { DemoCase } from '@/types';
import CaseDirectory from '@/components/features/cases/CaseDirectory';
import { redirect } from 'next/navigation';

export default async function CaseLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch all active cases (Processing) for the sidebar directory
    // We only need id, buyer_name, seller_name, status, case_number
    let query = supabase
        .from('cases')
        .select(`
            id, 
            case_number, 
            buyer_name, 
            seller_name, 
            status, 
            created_at
        `)
        .eq('user_id', user.id)
        .neq('status', 'Closed')
        .neq('status', 'Cancelled')
        .order('created_at', { ascending: false });

    const { data } = await query;
    const cases = (data || []) as unknown as DemoCase[];

    return (
        <div className="flex xl:flex-row gap-1.5 items-start relative">
            <CaseDirectory cases={cases} />
            <div className="flex-1 w-full min-w-0 transition-all duration-300">
                {children}
            </div>
        </div>
    );
}
