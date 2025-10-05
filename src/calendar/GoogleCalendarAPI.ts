import { google } from 'googleapis';
import { AuthManager } from './AuthManager';
import { DateUtils } from '../utils/DateUtils';
import { Notice } from 'obsidian';

export interface CalendarEvent {
    id: string;
    summary: string;
    start: string;
    end: string;
    attendees: Array<{
        email: string;
        displayName?: string;
    }>;
}

export class GoogleCalendarAPI {
    private authManager: AuthManager;

    constructor(authManager: AuthManager) {
        this.authManager = authManager;
    }

    /**
     * Fetch today's calendar events
     */
    async getTodayEvents(): Promise<CalendarEvent[]> {
        const now = new Date();
        return this.getEventsForDate(now);
    }

    /**
     * Fetch calendar events for a specific date
     */
    async getEventsForDate(date: Date): Promise<CalendarEvent[]> {
        if (!this.authManager.isAuthenticated()) {
            throw new Error('Not authenticated with Google Calendar');
        }

        try {
            const calendar = google.calendar({ version: 'v3', auth: this.authManager.getClient() });
            const { start, end } = DateUtils.getDateRange(date);

            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: start,
                timeMax: end,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items || [];

            return events.map(event => {
                // Handle all-day events
                const startTime = event.start?.dateTime || event.start?.date || '';
                const endTime = event.end?.dateTime || event.end?.date || '';

                // Extract attendees
                const attendees = (event.attendees || [])
                    .filter(attendee => attendee.email && !attendee.self) // Exclude self
                    .map(attendee => ({
                        email: attendee.email!,
                        displayName: attendee.displayName || undefined
                    }));

                return {
                    id: event.id || '',
                    summary: event.summary || 'Untitled Event',
                    start: startTime,
                    end: endTime,
                    attendees: attendees
                };
            });
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            new Notice('Failed to fetch calendar events. Check your authentication.');
            throw error;
        }
    }

    /**
     * Test connection to Google Calendar
     */
    async testConnection(): Promise<boolean> {
        try {
            const calendar = google.calendar({ version: 'v3', auth: this.authManager.getClient() });
            await calendar.calendarList.list();
            return true;
        } catch (error) {
            console.error('Failed to connect to Google Calendar:', error);
            return false;
        }
    }
}
