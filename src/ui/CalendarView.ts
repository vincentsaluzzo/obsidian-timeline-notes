import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { GoogleCalendarAPI, CalendarEvent } from '../calendar/GoogleCalendarAPI';
import { WikiLinkFormatter } from '../utils/WikiLinkFormatter';
import { DateUtils } from '../utils/DateUtils';
import TimelineNotesPlugin from '../../main';

export const CALENDAR_VIEW_TYPE = 'google-calendar-view';

export class CalendarView extends ItemView {
    private plugin: TimelineNotesPlugin;
    private calendarAPI: GoogleCalendarAPI;
    private events: CalendarEvent[] = [];
    private refreshInterval: number | null = null;
    private currentDate: Date = new Date();

    constructor(leaf: WorkspaceLeaf, plugin: TimelineNotesPlugin, calendarAPI: GoogleCalendarAPI) {
        super(leaf);
        this.plugin = plugin;
        this.calendarAPI = calendarAPI;
    }

    getViewType(): string {
        return CALENDAR_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Today\'s Calendar';
    }

    getIcon(): string {
        return 'calendar';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('google-calendar-view');

        // Register event listener for active file changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.onActiveFileChanged();
            })
        );

        // Register event listener for file open
        this.registerEvent(
            this.app.workspace.on('file-open', () => {
                this.onActiveFileChanged();
            })
        );

        // Register event listener for timeline visible day changes
        this.registerEvent(
            // @ts-ignore - Custom event type
            this.app.workspace.on('timeline-visible-day-changed', (date: Date) => {
                this.onTimelineVisibleDayChanged(date);
            })
        );

        // Register event listener for layout changes (to detect timeline closing)
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                // When layout changes (timeline closes/opens), refresh based on current context
                this.onActiveFileChanged();
            })
        );

        // Initial load
        this.onActiveFileChanged();
        this.startAutoRefresh();
    }

    async onClose(): Promise<void> {
        this.stopAutoRefresh();
    }

    /**
     * Check if the timeline view is currently the active tab
     */
    private isTimelineViewActive(): boolean {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) return false;

        // Check if the active leaf is showing the timeline view
        return activeLeaf.view.getViewType() === 'daily-timeline-view';
    }

    /**
     * Called when the active file changes
     * Updates the view to show events for the new file's date
     * ONLY if the timeline view is not active
     */
    private async onActiveFileChanged(): Promise<void> {
        // If timeline view is active, ignore active file changes
        // The timeline will send its own events
        if (this.isTimelineViewActive()) {
            return;
        }

        const newDate = this.getActiveNoteDate();

        // Only refresh if the date has changed
        if (newDate.toDateString() !== this.currentDate.toDateString()) {
            this.currentDate = newDate;
            await this.refreshEvents();
        }
    }

    /**
     * Called when the timeline view scrolls to a different day
     * Updates the calendar to show events for that day
     */
    private async onTimelineVisibleDayChanged(date: Date): Promise<void> {
        // Only refresh if the date has changed
        if (date.toDateString() !== this.currentDate.toDateString()) {
            this.currentDate = date;
            await this.refreshEvents();
        }
    }

    /**
     * Get the date to display events for
     * If active file is a daily note, use that date
     * Otherwise, use today
     */
    private getActiveNoteDate(): Date {
        const activeFile = this.app.workspace.getActiveFile();

        if (activeFile) {
            const parsedDate = DateUtils.parseDateFromFilename(activeFile.basename);
            if (parsedDate) {
                return parsedDate;
            }
        }

        // Fallback to today
        return new Date();
    }

    /**
     * Refresh calendar events
     */
    async refreshEvents(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();

        // Determine which date to show
        const displayDate = this.currentDate;
        const dateString = DateUtils.formatDateString(displayDate);
        const isToday = dateString === DateUtils.getTodayDateString();

        // Add header with refresh button
        const header = container.createDiv({ cls: 'calendar-header' });
        const dayOfWeek = displayDate.toLocaleDateString('en-US', { weekday: 'long' });
        const headerText = isToday
            ? `Events for Today (${dayOfWeek}, ${dateString})`
            : `Events for ${dayOfWeek}, ${dateString}`;
        header.createEl('h4', { text: headerText });

        const refreshBtn = header.createEl('button', {
            text: '↻',
            cls: 'calendar-refresh-btn'
        });
        refreshBtn.onclick = () => this.refreshEvents();

        try {
            this.events = await this.calendarAPI.getEventsForDate(displayDate);

            if (this.events.length === 0) {
                const noEventsText = isToday ? 'No events today' : `No events on ${dateString}`;
                container.createDiv({
                    text: noEventsText,
                    cls: 'calendar-no-events'
                });
                return;
            }

            // Create event list
            const eventList = container.createDiv({ cls: 'calendar-event-list' });

            this.events.forEach(event => {
                const eventEl = eventList.createDiv({ cls: 'calendar-event-item' });

                // Time
                const timeEl = eventEl.createDiv({ cls: 'calendar-event-time' });
                if (event.start) {
                    const startTime = DateUtils.formatTime(event.start);
                    const endTime = event.end ? DateUtils.formatTime(event.end) : '';
                    timeEl.setText(`${startTime}${endTime ? ' - ' + endTime : ''}`);
                }

                // Title
                const titleEl = eventEl.createDiv({ cls: 'calendar-event-title' });
                titleEl.setText(event.summary);

                // Attendees
                if (event.attendees && event.attendees.length > 0) {
                    const attendeesEl = eventEl.createDiv({ cls: 'calendar-event-attendees' });
                    const attendeeNames = event.attendees
                        .map(a => WikiLinkFormatter.extractName(a.email, a.displayName))
                        .join(', ');
                    attendeesEl.setText(`👥 ${attendeeNames}`);
                }

                // Make clickable
                eventEl.addClass('clickable');
                eventEl.onclick = () => this.insertEventToNote(event);
            });

        } catch (error) {
            console.error('Error loading calendar events:', error);
            container.createDiv({
                text: 'Failed to load events. Check authentication.',
                cls: 'calendar-error'
            });
        }
    }

    /**
     * Insert all events to daily note at cursor position
     */
    async insertAllEventsToNote(): Promise<void> {
        if (this.events.length === 0) {
            new Notice('No events to insert');
            return;
        }

        try {
            // Find the most recent markdown editor
            const editor = this.findMarkdownEditor();

            if (!editor) {
                new Notice('No markdown editor found. Please open a note first.');
                return;
            }

            // Get cursor position
            const cursor = editor.getCursor();

            // Check if we're already in a list
            const isInList = this.isCurrentLineInList(editor, cursor.line);

            // Format all events
            const formattedEvents = this.events.map(event =>
                WikiLinkFormatter.formatEventAsBullet(
                    event.summary,
                    event.attendees,
                    !isInList // Don't add bullet if already in a list
                )
            ).join('\n');

            // Insert at cursor position
            editor.replaceRange(formattedEvents + '\n', cursor);

            // Move cursor to end of inserted text
            const lines = formattedEvents.split('\n').length;
            editor.setCursor({
                line: cursor.line + lines,
                ch: 0
            });

            new Notice(`Inserted ${this.events.length} events`);
        } catch (error) {
            console.error('Error inserting events to note:', error);
            new Notice('Failed to insert events to note');
        }
    }

    /**
     * Insert event as bullet point to daily note
     */
    async insertEventToNote(event: CalendarEvent): Promise<void> {
        try {
            // Find the most recent markdown editor (not the calendar view)
            const editor = this.findMarkdownEditor();

            if (!editor) {
                new Notice('No markdown editor found. Please open a note first.');
                return;
            }

            // Get cursor position
            const cursor = editor.getCursor();

            // Check if we're already in a list
            const isInList = this.isCurrentLineInList(editor, cursor.line);

            // Format the event text (with or without bullet)
            const formattedText = WikiLinkFormatter.formatEventAsBullet(
                event.summary,
                event.attendees,
                !isInList // Don't add bullet if already in a list
            );

            // Insert at cursor position
            editor.replaceRange(formattedText + '\n', cursor);

            // Move cursor to end of inserted text
            editor.setCursor({
                line: cursor.line + 1,
                ch: 0
            });

            new Notice(`Inserted: ${event.summary}`);
        } catch (error) {
            console.error('Error inserting event to note:', error);
            new Notice('Failed to insert event to note');
        }
    }

    /**
     * Check if the current line or context is in a list
     * Returns true if cursor is in a list item context
     */
    private isCurrentLineInList(editor: any, lineNumber: number): boolean {
        const line = editor.getLine(lineNumber);

        // Check if current line starts with list marker
        // Matches: "- ", "* ", "+ ", "1. ", "2. ", etc., with optional indentation
        const listPattern = /^\s*[-*+](\s|$)|^\s*\d+\.\s/;

        if (listPattern.test(line)) {
            return true;
        }

        // Check if we're at the end of a list item (cursor at end of line that is a list)
        if (lineNumber > 0) {
            const previousLine = editor.getLine(lineNumber - 1);
            if (listPattern.test(previousLine) && line.trim() === '') {
                return true;
            }
        }

        return false;
    }

    /**
     * Find a markdown editor in the workspace
     * Looks for MarkdownView with an editor, excluding the calendar view itself
     */
    private findMarkdownEditor(): any {
        // Check if we're in timeline view - if so, find the editor in the currently visible day
        const timelineLeaves = this.app.workspace.getLeavesOfType('daily-timeline-view');
        if (timelineLeaves.length > 0) {
            // Get all embedded markdown views in the timeline
            const timelineContainer = timelineLeaves[0].view.containerEl;
            const embeddedEditors = timelineContainer.querySelectorAll('.timeline-day-editor .markdown-source-view');

            // Find the one that's most visible (closest to viewport top)
            let closestEditor: any = null;
            let closestDistance = Infinity;

            embeddedEditors.forEach((editorEl: Element) => {
                const rect = editorEl.getBoundingClientRect();
                const distance = Math.abs(rect.top);

                if (distance < closestDistance && rect.top >= 0 && rect.bottom > 0) {
                    // Try to get the editor from this element
                    // @ts-ignore
                    const cmEditor = editorEl.cmView?.view;
                    if (cmEditor) {
                        // Create a wrapper that mimics the editor API
                        const leaf = timelineContainer.querySelector('.workspace-leaf');
                        if (leaf) {
                            // @ts-ignore - access the leaf's view
                            const views = Array.from(timelineContainer.querySelectorAll('.workspace-leaf'))
                                .map((l: any) => l.view)
                                .filter(v => v && v.editor);

                            for (const view of views) {
                                const viewRect = view.containerEl.getBoundingClientRect();
                                if (Math.abs(viewRect.top - rect.top) < 100) {
                                    closestEditor = view.editor;
                                    closestDistance = distance;
                                    break;
                                }
                            }
                        }
                    }
                }
            });

            if (closestEditor) {
                return closestEditor;
            }
        }

        // Try to get the active leaf first
        const activeLeaf = this.app.workspace.getMostRecentLeaf();
        if (activeLeaf && activeLeaf.view.getViewType() === 'markdown') {
            // @ts-ignore - accessing editor
            const editor = activeLeaf.view.editor;
            if (editor) {
                return editor;
            }
        }

        // Fallback: search all leaves for a markdown view
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        if (leaves.length > 0) {
            // @ts-ignore - accessing editor
            const editor = leaves[0].view.editor;
            if (editor) {
                return editor;
            }
        }

        return null;
    }

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh(): void {
        // Refresh every 5 minutes (300000ms)
        const refreshInterval = this.plugin.settings.refreshInterval || 300000;

        this.refreshInterval = window.setInterval(() => {
            this.refreshEvents();
        }, refreshInterval);
    }

    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh(): void {
        if (this.refreshInterval !== null) {
            window.clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}
