'use server';

import { createClient } from '@/lib/supabase/server';

export async function seedBankContacts(contacts: any[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const payload = contacts.map(c => ({
        bank_name: c.Bank,
        branch_name: c.Branch || '',
        contact_person: c.Name,
        email: c.Email || '',
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('bank_contacts').insert(payload);
    if (error) return { error: error.message };
    return { success: true };
}
