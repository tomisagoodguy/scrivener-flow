import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const res = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=25.0934&longitude=121.5242&current_weather=true',
            { next: { revalidate: 1800 } } // Cache for 30 minutes
        );

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[Weather API] Open-Meteo failed: ${res.status}`, errorText);
            throw new Error(`Weather API Error: ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Weather API] Internal Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch weather data', details: error.message },
            { status: 500 }
        );
    }
}
