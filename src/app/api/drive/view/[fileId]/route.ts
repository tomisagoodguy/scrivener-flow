import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    const { fileId } = await params;
    const supabase = await createClient();

    // 1. Get user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
        return new NextResponse('Unauthorized: No user session', { status: 401 });
    }

    // 2. Get the persisted Google Access Token from database
    const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token')
        .eq('user_id', userId)
        .single();

    const token = session?.provider_token || settings?.google_access_token;

    if (!token) {
        return new NextResponse('Unauthorized: No Google Token found in session or DB', { status: 401 });
    }

    try {
        console.log(`[DriveProxy] Fetching file: ${fileId}`);
        // 2. Fetch the file content from Google Drive API
        // alt=media parameter tells Drive to return the file content directly
        const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!driveResponse.ok) {
            const errorText = await driveResponse.text();
            console.error(`[DriveProxy] Google API Error: ${driveResponse.status}`, errorText);
            return new NextResponse(`Google Drive Error (${driveResponse.status}): ${errorText}`, { status: driveResponse.status });
        }

        // 3. Forward the content with appropriate headers
        const contentType = driveResponse.headers.get('Content-Type') || 'image/png';
        const buffer = await driveResponse.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            },
        });
    } catch (error: any) {
        console.error('[DriveProxy] Internal Error:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
