import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TimelineView, TIMELINE_VIEW_TYPE } from './src/ui/TimelineView';
import { TimelineNotesSettingTab } from './src/ui/SettingsTab';

// These will be imported dynamically on desktop only
let CalendarView: any;
let CALENDAR_VIEW_TYPE: string;
let AuthManager: any;
let GoogleCalendarAPI: any;
type TokenData = any;

interface TimelineNotesSettings {
    clientId: string;
    clientSecret: string;
    tokenData: TokenData | null;
    refreshInterval: number; // in milliseconds
    dailyNotesFolder: string;
    dailyNoteDateFormat: string;
    dailyNoteTemplate: string;
}

const DEFAULT_SETTINGS: TimelineNotesSettings = {
    clientId: '',
    clientSecret: '',
    tokenData: null,
    refreshInterval: 300000, // 5 minutes
    dailyNotesFolder: '',
    dailyNoteDateFormat: 'YYYY-MM-DD',
    dailyNoteTemplate: ''
};

export default class TimelineNotesPlugin extends Plugin {
    settings: TimelineNotesSettings;
    authManager: any;
    calendarAPI: any;

    async onload() {
        await this.loadSettings();

        // Check if we're on mobile - Google Calendar API won't work on mobile
        // @ts-ignore - isMobile exists but not in types
        const isMobile = this.app.isMobile;

        if (!isMobile) {
            try {
                // Dynamically import Google Calendar modules (desktop only)
                const calendarModule = await import('./src/ui/CalendarView');
                CalendarView = calendarModule.CalendarView;
                CALENDAR_VIEW_TYPE = calendarModule.CALENDAR_VIEW_TYPE;

                const authModule = await import('./src/calendar/AuthManager');
                AuthManager = authModule.AuthManager;

                const apiModule = await import('./src/calendar/GoogleCalendarAPI');
                GoogleCalendarAPI = apiModule.GoogleCalendarAPI;

                // Initialize Auth Manager (desktop only)
                this.authManager = new AuthManager();

                // If we have stored credentials, initialize auth manager
                if (this.settings.clientId && this.settings.clientSecret) {
                    this.authManager.initialize({
                        clientId: this.settings.clientId,
                        clientSecret: this.settings.clientSecret,
                        redirectUri: 'http://localhost:42813'
                    });

                    // If we have token data, set it
                    if (this.settings.tokenData) {
                        this.authManager.setTokenData(this.settings.tokenData);
                    }
                }

                // Initialize Calendar API (desktop only)
                this.calendarAPI = new GoogleCalendarAPI(this.authManager);

                // Register the calendar view (desktop only)
                this.registerView(
                    CALENDAR_VIEW_TYPE,
                    (leaf) => new CalendarView(leaf, this, this.calendarAPI)
                );
            } catch (error) {
                console.error('Failed to load Google Calendar modules (desktop features will be unavailable):', error);
            }
        }

        // Register the timeline view (works on both desktop and mobile)
        this.registerView(
            TIMELINE_VIEW_TYPE,
            (leaf) => new TimelineView(leaf, this)
        );

        // Add ribbon icons and commands (desktop only for calendar, both for timeline)
        if (!isMobile) {
            // Add ribbon icon to open calendar view (desktop only)
            this.addRibbonIcon('calendar', 'Open Today\'s Calendar', async () => {
                await this.activateCalendarView();
            });

            // Add command to open calendar view (desktop only)
            this.addCommand({
                id: 'open-calendar-view',
                name: 'Open Today\'s Calendar',
                callback: async () => {
                    await this.activateCalendarView();
                }
            });

            // Add command to refresh calendar (desktop only)
            this.addCommand({
                id: 'refresh-calendar',
                name: 'Refresh Calendar Events',
                callback: async () => {
                    const leaves = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE);
                    for (const leaf of leaves) {
                        if (leaf.view.getViewType() === CALENDAR_VIEW_TYPE) {
                            await (leaf.view as any).refreshEvents();
                        }
                    }
                }
            });

            // Add command to insert all events (desktop only)
            this.addCommand({
                id: 'insert-all-events',
                name: 'Insert all events from calendar',
                callback: async () => {
                    const leaves = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE);
                    for (const leaf of leaves) {
                        if (leaf.view.getViewType() === CALENDAR_VIEW_TYPE) {
                            await (leaf.view as any).insertAllEventsToNote();
                        }
                    }
                }
            });
        }

        // Add ribbon icon to open timeline view (works on mobile)
        this.addRibbonIcon('calendar-days', 'Open Daily Timeline', async () => {
            await this.activateTimelineView();
        });

        // Add command to open timeline view (works on mobile)
        this.addCommand({
            id: 'open-timeline-view',
            name: 'Open Daily Timeline',
            callback: async () => {
                await this.activateTimelineView();
            }
        });

        // Add command to go to today in timeline (works on mobile)
        this.addCommand({
            id: 'timeline-go-to-today',
            name: 'Timeline: Go to today',
            callback: () => {
                const leaves = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
                for (const leaf of leaves) {
                    if (leaf.view instanceof TimelineView) {
                        leaf.view.scrollToToday();
                    }
                }
            }
        });

        // Add settings tab
        this.addSettingTab(new TimelineNotesSettingTab(this.app, this));

        // Activate calendar view on startup if authenticated (desktop only)
        if (!isMobile && this.authManager && this.authManager.isAuthenticated()) {
            this.app.workspace.onLayoutReady(() => {
                this.activateCalendarView();
            });
        }
    }

    async onunload() {
        // Detach all views
        this.app.workspace.detachLeavesOfType(CALENDAR_VIEW_TYPE);
        this.app.workspace.detachLeavesOfType(TIMELINE_VIEW_TYPE);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateCalendarView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(CALENDAR_VIEW_TYPE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: CALENDAR_VIEW_TYPE, active: true });
            }
        }

        // Reveal the leaf in case it is in a collapsed sidebar
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async activateTimelineView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Create a new leaf in the center (main area)
            leaf = workspace.getLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
            }
        }

        // Reveal the leaf
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }
}
