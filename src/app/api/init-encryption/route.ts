
import { KeyVault } from '@/lib/crypto/keyManagement';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        await KeyVault.initialize();
        return NextResponse.json({ success: true, message: 'Encryption system initialized' });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function GET() {
    try {
        await KeyVault.initialize();
        return NextResponse.json({ success: true, message: 'Encryption system initialized (GET)' });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
