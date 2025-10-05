import { App, TFile, TFolder, Notice } from 'obsidian';
import { DateUtils } from '../utils/DateUtils';

export interface DailyNoteConfig {
    folder: string;           // Folder path for daily notes
    dateFormat: string;       // Format for filename (e.g., "YYYY-MM-DD")
    templatePath?: string;    // Optional template file path
}

export class DailyNoteManager {
    private app: App;
    private config: DailyNoteConfig;

    constructor(app: App, config: DailyNoteConfig) {
        this.app = app;
        this.config = config;
    }

    /**
     * Update configuration
     */
    updateConfig(config: DailyNoteConfig): void {
        this.config = config;
    }

    /**
     * Get the filename for a given date
     */
    getFilenameForDate(date: Date): string {
        // Use moment-like formatting (simplified)
        const dateStr = DateUtils.formatDateString(date);
        return `${dateStr}.md`;
    }

    /**
     * Get the full path for a daily note
     */
    getPathForDate(date: Date): string {
        const filename = this.getFilenameForDate(date);
        const folder = this.config.folder.trim();

        if (folder === '' || folder === '/') {
            return filename;
        }

        // Ensure folder doesn't start with / and ends without /
        const cleanFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '');
        return `${cleanFolder}/${filename}`;
    }

    /**
     * Check if a daily note exists for a given date
     */
    async exists(date: Date): Promise<boolean> {
        const path = this.getPathForDate(date);
        const file = this.app.vault.getAbstractFileByPath(path);
        return file instanceof TFile;
    }

    /**
     * Get the daily note file for a given date (if it exists)
     */
    async getFile(date: Date): Promise<TFile | null> {
        const path = this.getPathForDate(date);
        const file = this.app.vault.getAbstractFileByPath(path);

        if (file instanceof TFile) {
            return file;
        }

        return null;
    }

    /**
     * Load content of daily note for a given date
     * Returns null if doesn't exist
     */
    async loadContent(date: Date): Promise<string | null> {
        const file = await this.getFile(date);

        if (!file) {
            return null;
        }

        try {
            return await this.app.vault.read(file);
        } catch (error) {
            console.error('Error reading daily note:', error);
            return null;
        }
    }

    /**
     * Create a new daily note for a given date
     */
    async create(date: Date, content: string = ''): Promise<TFile> {
        const path = this.getPathForDate(date);

        // Ensure folder exists
        const folder = this.config.folder.trim();
        if (folder && folder !== '/') {
            const cleanFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '');
            await this.ensureFolderExists(cleanFolder);
        }

        // Load template if specified
        let finalContent = content;
        if (!content && this.config.templatePath) {
            const templateContent = await this.loadTemplate();
            if (templateContent !== null) {
                finalContent = this.processTemplate(templateContent, date);
            }
        }

        // Create the file
        try {
            const file = await this.app.vault.create(path, finalContent);
            return file;
        } catch (error) {
            console.error('Error creating daily note:', error);
            new Notice(`Failed to create daily note: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save content to a daily note
     * Creates the file if it doesn't exist
     */
    async save(date: Date, content: string): Promise<TFile> {
        const file = await this.getFile(date);

        if (file) {
            // Update existing file
            try {
                await this.app.vault.modify(file, content);
                return file;
            } catch (error) {
                console.error('Error saving daily note:', error);
                new Notice(`Failed to save daily note: ${error.message}`);
                throw error;
            }
        } else {
            // Create new file
            return await this.create(date, content);
        }
    }

    /**
     * Ensure a folder exists, creating it if necessary
     */
    private async ensureFolderExists(folderPath: string): Promise<void> {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);

        if (!folder) {
            try {
                await this.app.vault.createFolder(folderPath);
            } catch (error) {
                // Folder might already exist or parent doesn't exist
                // Try to create parent folders recursively
                const parts = folderPath.split('/');
                let currentPath = '';

                for (const part of parts) {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    const exists = this.app.vault.getAbstractFileByPath(currentPath);

                    if (!exists) {
                        await this.app.vault.createFolder(currentPath);
                    }
                }
            }
        }
    }

    /**
     * Load template content
     */
    private async loadTemplate(): Promise<string | null> {
        if (!this.config.templatePath) {
            return null;
        }

        const templateFile = this.app.vault.getAbstractFileByPath(this.config.templatePath);

        if (templateFile instanceof TFile) {
            try {
                return await this.app.vault.read(templateFile);
            } catch (error) {
                console.error('Error reading template:', error);
                return null;
            }
        }

        return null;
    }

    /**
     * Process template with date variables
     * Simple replacement for common date placeholders
     */
    private processTemplate(template: string, date: Date): string {
        const dateStr = DateUtils.formatDateString(date);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
        const dayOfMonth = date.getDate();
        const year = date.getFullYear();

        return template
            .replace(/{{date}}/g, dateStr)
            .replace(/{{day}}/g, dayOfWeek)
            .replace(/{{month}}/g, monthName)
            .replace(/{{year}}/g, String(year))
            .replace(/{{date:YYYY-MM-DD}}/g, dateStr);
    }
}
