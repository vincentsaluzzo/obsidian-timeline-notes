export class DateUtils {
    /**
     * Get the start and end of today in ISO format
     */
    static getTodayRange(): { start: string; end: string } {
        const now = new Date();
        return this.getDateRange(now);
    }

    /**
     * Get the start and end of a specific date in ISO format
     */
    static getDateRange(date: Date): { start: string; end: string } {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }

    /**
     * Format time from ISO string to HH:MM format
     */
    static formatTime(isoString: string): string {
        const date = new Date(isoString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * Get today's date in YYYY-MM-DD format for daily note
     */
    static getTodayDateString(): string {
        const now = new Date();
        return this.formatDateString(now);
    }

    /**
     * Format a Date object to YYYY-MM-DD string
     */
    static formatDateString(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Parse date from daily note filename
     * Supports common formats:
     * - YYYY-MM-DD
     * - YYYY-MM-DD.md
     * - YYYY-MM-DD Day.md
     * - Day YYYY-MM-DD.md
     * Returns null if no valid date found
     */
    static parseDateFromFilename(filename: string): Date | null {
        if (!filename) return null;

        // Remove .md extension if present
        const nameWithoutExt = filename.replace(/\.md$/, '');

        // Try to match YYYY-MM-DD pattern
        const datePattern = /(\d{4})-(\d{2})-(\d{2})/;
        const match = nameWithoutExt.match(datePattern);

        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
            const day = parseInt(match[3], 10);

            // Validate the date
            const date = new Date(year, month, day);
            if (
                date.getFullYear() === year &&
                date.getMonth() === month &&
                date.getDate() === day
            ) {
                return date;
            }
        }

        return null;
    }

    /**
     * Check if a filename looks like a daily note
     */
    static isDailyNoteFilename(filename: string): boolean {
        return this.parseDateFromFilename(filename) !== null;
    }
}
