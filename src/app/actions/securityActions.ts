'use server';

import { createClient } from '@/lib/auth/client';
import { getServiceClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

/**
 * 紀錄使用者對資安聲明的確認
 * 這可以幫助專案負責人追蹤：
 * 1. 同事是否確實點擊了「了解風險」
 * 2. 登入時的 IP 來源（判斷是否在公司環境）
 */
export async function logSecurityAcknowledgement(userId: string, email: string) {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();

    // 這裡我們假設有一個 logs 資料表，或者直接印出以便在 Supabase Logs 看到
    // 在正式環境中，建議在 Supabase 建立一個 audit_logs 資料表
    console.log(`[Security Audit] User: ${email} (${userId}) acknowledged security warning at ${timestamp}. IP: ${ip}, UA: ${userAgent}`);
    
    // 如果有資料表，可以執行：
    /*
    const supabase = getServiceClient();
    await supabase.from('security_audit_logs').insert({
        user_id: userId,
        email: email,
        event: 'security_acknowledged',
        ip_address: ip,
        user_agent: userAgent,
        confirmed_at: timestamp
    });
    */

    return { success: true, ip };
}
