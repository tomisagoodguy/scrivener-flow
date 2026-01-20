
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BANK_CONTACTS, BANK_REDEMPTION_INFO } from '@/data/bankData';

export async function GET() {
    console.log('Starting bank data migration...');
    const supabase = await createClient();

    // 1. Generate the "Local Rich Data" structure
    // (Replicating logic from src/app/banks/page.tsx)
    const contactBanks = BANK_CONTACTS.map(c => (c as any).credit_system || c.bank_name);
    const redemptionBanks = BANK_REDEMPTION_INFO.map(r => r.bank_name);
    const allNames = Array.from(new Set([...contactBanks, ...redemptionBanks])).filter(Boolean).sort();

    const localBanks = allNames.map(name => {
        const r = BANK_REDEMPTION_INFO.find(i => i.bank_name === name);
        const relatedContacts = BANK_CONTACTS.filter(c =>
            ((c as any).credit_system === name) || (c.bank_name === name)
        );

        return {
            name: name,
            loan_conditions: '', // Local data doesn't have this, keep empty or preserve DB value? We'll handle this in merge
            redemption_phone: r?.phone || '',
            redemption_account: r?.account_info || '',
            redemption_days: r?.processing_days || '',
            redemption_location: r?.pickup_location || '',
            redemption_note: [r?.requirements, r?.notes].filter(Boolean).join('\n'),
            contacts: relatedContacts,
        };
    });

    try {
        // 2. Fetch existing DB records to map IDs
        const { data: existingBanks, error: fetchError } = await supabase
            .from('banks')
            .select('id, name, loan_conditions, contacts');

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        const stats = {
            updated: 0,
            inserted: 0,
            errors: 0
        };

        const results = [];

        for (const localBank of localBanks) {
            if (!localBank.name) continue;

            const existing = existingBanks?.find(b => b.name === localBank.name);

            if (existing) {
                // UPDATE: Merge logic
                // We want to restore 'contacts' and 'redemption info' from local if they are likely missing or inferior in DB.
                // But we don't want to overwrite 'loan_conditions' if the user typed something in DB.
                // For contacts, if DB has empty contacts but local has some, use local.
                // If DB has contacts, maybe we overwrite with local because "Local is the master Source of Truth for this migration"?
                // The user said "Bank info missing", so implying Local > DB for these fields.

                const payload = {
                    redemption_phone: localBank.redemption_phone,
                    redemption_account: localBank.redemption_account,
                    redemption_days: localBank.redemption_days,
                    redemption_location: localBank.redemption_location,
                    redemption_note: localBank.redemption_note,
                    contacts: localBank.contacts,
                    // Preserve existing loan_conditions if present
                    loan_conditions: existing.loan_conditions || localBank.loan_conditions
                };

                const { error } = await supabase
                    .from('banks')
                    .update(payload)
                    .eq('id', existing.id);

                if (error) {
                    console.error(`Error updating ${localBank.name}:`, error);
                    stats.errors++;
                    results.push({ name: localBank.name, status: 'error', msg: error.message });
                } else {
                    stats.updated++;
                    results.push({ name: localBank.name, status: 'updated' });
                }

            } else {
                // INSERT
                const { error } = await supabase
                    .from('banks')
                    .insert([localBank]);

                if (error) {
                    console.error(`Error inserting ${localBank.name}:`, error);
                    stats.errors++;
                    results.push({ name: localBank.name, status: 'error', msg: error.message });
                } else {
                    stats.inserted++;
                    results.push({ name: localBank.name, status: 'inserted' });
                }
            }
        }

        return NextResponse.json({
            message: 'Migration completed',
            stats,
            details: results
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
