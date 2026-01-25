import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const res = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=25.0330&longitude=121.5654&current_weather=true',
            { next: { revalidate: 1800 } } // Cache for 30 minutes
        );

        if (!res.ok) {
            throw new Error(`Weather API Error: ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Weather Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
