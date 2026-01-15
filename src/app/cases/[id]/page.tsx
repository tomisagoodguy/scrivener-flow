
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Case } from '@/types';
import EditCaseForm from '@/components/EditCaseForm';

                    <div className="flex items-center gap-3">
                        {/* <GoogleCalendarSyncButton caseData={caseData as any} /> - Removed as per request */}
                        <Link href="/cases" className="bg-secondary px-4 py-2 rounded text-sm text-foreground hover:bg-surface-hover transition-colors">
                            ← 返回列表
                        </Link>
                    </div>
                        <Link href="/cases" className="bg-secondary px-4 py-2 rounded text-sm text-foreground hover:bg-surface-hover transition-colors">
                            ← 返回列表
                        </Link>
                    </div >
                </header >

    <EditCaseForm initialData={caseData as any} />
            </main >
        </div >
    );
}
