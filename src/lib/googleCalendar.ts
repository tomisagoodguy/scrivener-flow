export interface GoogleCalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    start: {
        dateTime?: string; // ISO string
        date?: string; // YYYY-MM-DD
    };
    end: {
        dateTime?: string;
        date?: string;
    };
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
    };
}

export interface CalendarListEntry {
    id: string;
    summary: string;
    primary?: boolean;
}

const BASE_URL = 'https://www.googleapis.com/calendar/v3';

export class GoogleCalendarService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    private async fetch(endpoint: string, options: RequestInit = {}) {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(`Google Calendar API Error: ${JSON.stringify(error)}`);
        }

        return res.json();
    }

    async listCalendars(): Promise<CalendarListEntry[]> {
        const data = await this.fetch('/users/me/calendarList');
        return data.items || [];
    }

    async getPrimaryCalendarId(): Promise<string> {
        const calendars = await this.listCalendars();
        const primary = calendars.find((c) => c.primary);
        return primary ? primary.id : 'primary';
    }

    async listEvents(
        calendarId: string = 'primary',
        timeMin?: string,
        timeMax?: string
    ): Promise<GoogleCalendarEvent[]> {
        const params = new URLSearchParams({
            singleEvents: 'true',
            orderBy: 'startTime',
        });
        if (timeMin) params.append('timeMin', timeMin);
        if (timeMax) params.append('timeMax', timeMax);

        const data = await this.fetch(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
        return data.items || [];
    }

    async createEvent(event: GoogleCalendarEvent, calendarId: string = 'primary'): Promise<GoogleCalendarEvent> {
        return this.fetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: 'POST',
            body: JSON.stringify(event),
        });
    }
}
