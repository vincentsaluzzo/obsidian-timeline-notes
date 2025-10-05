export class WikiLinkFormatter {
    /**
     * Extract first name and last name from email or display name
     */
    static extractName(email: string, displayName?: string): string {
        if (displayName) {
            return displayName;
        }

        // Extract name from email (e.g., john.doe@example.com -> John Doe)
        const localPart = email.split('@')[0];
        const nameParts = localPart.split(/[._-]/);
        return nameParts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Format attendees as WikiLinks
     * Returns formatted string like "[[Person1]], [[Person2]] and [[Person3]]"
     */
    static formatAttendees(attendees: Array<{ email: string; displayName?: string }>): string {
        if (!attendees || attendees.length === 0) {
            return '';
        }

        const names = attendees.map(attendee =>
            `[[${this.extractName(attendee.email, attendee.displayName)}]]`
        );

        if (names.length === 1) {
            return names[0];
        } else if (names.length === 2) {
            return `${names[0]} and ${names[1]}`;
        } else {
            const lastPerson = names[names.length - 1];
            const otherPeople = names.slice(0, -1).join(', ');
            return `${otherPeople} and ${lastPerson}`;
        }
    }

    /**
     * Format event as bullet point with attendees
     */
    static formatEventAsBullet(eventTitle: string, attendees: Array<{ email: string; displayName?: string }>, includeBullet: boolean = true): string {
        const formattedAttendees = this.formatAttendees(attendees);

        const content = formattedAttendees
            ? `${eventTitle} with ${formattedAttendees}`
            : eventTitle;

        return includeBullet ? `- ${content}` : content;
    }
}
