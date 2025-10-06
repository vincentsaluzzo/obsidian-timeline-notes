import { App, PluginSettingTab, Setting, Notice, Modal, TFolder } from 'obsidian';
import TimelineNotesPlugin from '../../main';

export class AuthWaitingModal extends Modal {
    private plugin: TimelineNotesPlugin;
    private cancelled: boolean = false;
    private onCancel?: () => void;

    constructor(app: App, plugin: TimelineNotesPlugin, onCancel?: () => void) {
        super(app);
        this.plugin = plugin;
        this.onCancel = onCancel;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('auth-waiting-modal');

        contentEl.createEl('h2', { text: 'Waiting for Authorization' });

        // Spinner
        const spinnerContainer = contentEl.createDiv({ cls: 'auth-spinner-container' });
        const spinner = spinnerContainer.createDiv({ cls: 'auth-spinner' });

        // Instructions
        const instructions = contentEl.createDiv({ cls: 'auth-waiting-instructions' });
        instructions.createEl('p', {
            text: '🌐 Your browser should have opened to Google\'s authorization page.'
        });
        instructions.createEl('p', {
            text: 'Please authorize the application in your browser.'
        });
        instructions.createEl('p', {
            text: '⏳ Waiting for callback... (timeout in 60 seconds)'
        });

        // Cancel button
        const buttonContainer = contentEl.createDiv({ cls: 'auth-button-container' });
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-warning'
        });
        cancelButton.onclick = () => {
            this.cancelled = true;
            if (this.onCancel) {
                this.onCancel();
            }
            this.close();
        };
    }

    isCancelled(): boolean {
        return this.cancelled;
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class TimelineNotesSettingTab extends PluginSettingTab {
    plugin: TimelineNotesPlugin;

    constructor(app: App, plugin: TimelineNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Google Calendar Settings' });

        // Instructions
        containerEl.createEl('p', {
            text: 'To use this plugin, you need to set up Google Calendar API credentials. Follow these steps:'
        });

        const instructions = containerEl.createEl('ol');
        instructions.createEl('li', {
            text: 'Go to Google Cloud Console and create a new project'
        });
        instructions.createEl('li', {
            text: 'Enable the Google Calendar API for your project'
        });
        instructions.createEl('li', {
            text: 'Create OAuth 2.0 credentials (Desktop application type)'
        });
        instructions.createEl('li', {
            text: 'Copy the Client ID and Client Secret below'
        });

        // Client ID
        new Setting(containerEl)
            .setName('Client ID')
            .setDesc('OAuth 2.0 Client ID from Google Cloud Console')
            .addText(text => text
                .setPlaceholder('Enter Client ID')
                .setValue(this.plugin.settings.clientId || '')
                .onChange(async (value) => {
                    this.plugin.settings.clientId = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Client Secret
        new Setting(containerEl)
            .setName('Client Secret')
            .setDesc('OAuth 2.0 Client Secret from Google Cloud Console')
            .addText(text => {
                text.setPlaceholder('Enter Client Secret')
                    .setValue(this.plugin.settings.clientSecret || '')
                    .onChange(async (value) => {
                        this.plugin.settings.clientSecret = value.trim();
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
            });

        // Redirect URI (display only)
        new Setting(containerEl)
            .setName('Redirect URI')
            .setDesc('Use this redirect URI in your Google Cloud Console (copy this value)')
            .addText(text => {
                text.setValue('http://localhost:42813')
                    .setDisabled(true);
            });

        // Refresh Interval
        new Setting(containerEl)
            .setName('Refresh Interval')
            .setDesc('How often to refresh calendar events (in minutes)')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(String(this.plugin.settings.refreshInterval / 60000))
                .onChange(async (value) => {
                    const minutes = parseInt(value);
                    if (!isNaN(minutes) && minutes > 0) {
                        this.plugin.settings.refreshInterval = minutes * 60000;
                        await this.plugin.saveSettings();
                    }
                }));

        // Daily Notes Section
        containerEl.createEl('h3', { text: 'Daily Notes Timeline' });

        // Check if we can sync from official Daily Notes plugin
        const dailyNotesSettings = this.getOfficialDailyNotesSettings();
        if (dailyNotesSettings) {
            const syncInfo = containerEl.createDiv({ cls: 'daily-notes-sync-info' });
            syncInfo.createEl('p', {
                text: '💡 Detected settings from official Daily Notes plugin',
                cls: 'setting-item-description'
            });

            new Setting(containerEl)
                .setName('Sync from Daily Notes Plugin')
                .setDesc(`Use settings from official Daily Notes: Folder="${dailyNotesSettings.folder || '/'}", Format="${dailyNotesSettings.format}"`)
                .addButton(button => button
                    .setButtonText('Sync Settings')
                    .onClick(async () => {
                        this.plugin.settings.dailyNotesFolder = dailyNotesSettings.folder || '';
                        this.plugin.settings.dailyNoteDateFormat = dailyNotesSettings.format || 'YYYY-MM-DD';
                        this.plugin.settings.dailyNoteTemplate = dailyNotesSettings.template || '';
                        await this.plugin.saveSettings();
                        new Notice('✅ Synced settings from Daily Notes plugin');
                        this.display(); // Refresh
                    }));
        }

        // Daily Notes Folder with suggestions
        new Setting(containerEl)
            .setName('Daily Notes Folder')
            .setDesc('Folder where daily notes are stored (leave empty for vault root)')
            .addText(text => {
                text.setPlaceholder('daily')
                    .setValue(this.plugin.settings.dailyNotesFolder || '')
                    .onChange(async (value) => {
                        this.plugin.settings.dailyNotesFolder = value.trim();
                        await this.plugin.saveSettings();
                    });

                // Add folder suggestions
                this.addFolderSuggestions(text.inputEl);
            });

        // Daily Notes Date Format
        new Setting(containerEl)
            .setName('Date Format')
            .setDesc('Format for daily note filenames (YYYY-MM-DD recommended)')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dailyNoteDateFormat || 'YYYY-MM-DD')
                .onChange(async (value) => {
                    this.plugin.settings.dailyNoteDateFormat = value.trim() || 'YYYY-MM-DD';
                    await this.plugin.saveSettings();
                }));

        // Daily Notes Template
        new Setting(containerEl)
            .setName('Template File')
            .setDesc('Optional: Path to template file for new daily notes')
            .addText(text => text
                .setPlaceholder('templates/daily-note.md')
                .setValue(this.plugin.settings.dailyNoteTemplate || '')
                .onChange(async (value) => {
                    this.plugin.settings.dailyNoteTemplate = value.trim();
                    await this.plugin.saveSettings();
                }));

        // Authentication Section
        containerEl.createEl('h3', { text: 'Authentication' });

        // Auth Status
        const authStatus = containerEl.createDiv({ cls: 'auth-status' });
        if (this.plugin.authManager && this.plugin.authManager.isAuthenticated()) {
            authStatus.createEl('p', {
                text: '✅ Authenticated with Google Calendar',
                cls: 'auth-status-success'
            });
        } else {
            authStatus.createEl('p', {
                text: '❌ Not authenticated',
                cls: 'auth-status-error'
            });
        }

        // Authenticate Button
        new Setting(containerEl)
            .setName('Authenticate')
            .setDesc('Authorize this plugin to access your Google Calendar')
            .addButton(button => button
                .setButtonText('Authenticate with Google')
                .onClick(async () => {
                    await this.startAuthFlow();
                }));

        // Clear Auth Button
        if (this.plugin.authManager && this.plugin.authManager.isAuthenticated()) {
            new Setting(containerEl)
                .setName('Clear Authentication')
                .setDesc('Remove stored authentication tokens')
                .addButton(button => button
                    .setButtonText('Clear Authentication')
                    .setWarning()
                    .onClick(async () => {
                        if (this.plugin.authManager) {
                            this.plugin.authManager.clearAuth();
                            this.plugin.settings.tokenData = null;
                            await this.plugin.saveSettings();
                            new Notice('Authentication cleared');
                            this.display(); // Refresh settings display
                        }
                    }));
        }
    }

    /**
     * Get settings from official Daily Notes plugin
     */
    private getOfficialDailyNotesSettings(): { folder: string; format: string; template: string } | null {
        try {
            // Try to get daily-notes plugin settings
            // @ts-ignore - accessing internal plugin data
            const dailyNotesPlugin = this.app.internalPlugins?.plugins?.['daily-notes'];

            if (dailyNotesPlugin && dailyNotesPlugin.enabled) {
                // @ts-ignore - accessing plugin instance
                const instance = dailyNotesPlugin.instance;
                if (instance && instance.options) {
                    return {
                        folder: instance.options.folder || '',
                        format: instance.options.format || 'YYYY-MM-DD',
                        template: instance.options.template || ''
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error reading Daily Notes settings:', error);
            return null;
        }
    }

    /**
     * Add folder suggestions to input element
     */
    private addFolderSuggestions(inputEl: HTMLInputElement): void {
        // Get all folders in vault
        const folders = this.app.vault.getAllLoadedFiles()
            .filter(file => file instanceof TFolder) // Is a folder
            .map(folder => folder.path)
            .sort();

        // Create datalist for autocomplete
        const datalistId = 'folder-suggestions-' + Date.now();
        const datalist = document.createElement('datalist');
        datalist.id = datalistId;

        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            datalist.appendChild(option);
        });

        inputEl.setAttribute('list', datalistId);
        inputEl.parentElement?.appendChild(datalist);
    }

    async startAuthFlow(): Promise<void> {
        if (!this.plugin.authManager) {
            new Notice('Authentication is not available on this platform');
            return;
        }

        if (!this.plugin.settings.clientId || !this.plugin.settings.clientSecret) {
            new Notice('Please enter Client ID and Client Secret first');
            return;
        }

        // Initialize auth manager
        this.plugin.authManager.initialize({
            clientId: this.plugin.settings.clientId,
            clientSecret: this.plugin.settings.clientSecret,
            redirectUri: 'http://localhost:42813'
        });

        let authCancelled = false;

        // Show waiting modal
        const waitingModal = new AuthWaitingModal(
            this.app,
            this.plugin,
            () => {
                authCancelled = true;
            }
        );

        waitingModal.open();

        try {
            // Start automatic OAuth flow with callback server
            if (!this.plugin.authManager) {
                throw new Error('Auth manager not available');
            }
            const tokenData = await this.plugin.authManager.authenticateWithCallback();

            if (!authCancelled) {
                // Save tokens
                this.plugin.settings.tokenData = tokenData;
                await this.plugin.saveSettings();

                // Close waiting modal
                waitingModal.close();

                // Show success
                new Notice('✅ Successfully authenticated with Google Calendar!');
                this.display(); // Refresh settings display

                // Reload the calendar view
                await this.plugin.activateCalendarView();
            }
        } catch (error) {
            console.error('Authentication error:', error);

            // Close waiting modal
            if (!authCancelled) {
                waitingModal.close();
            }

            // Show error notice
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('timeout')) {
                new Notice('⏱️ Authentication timed out. Please try again.', 5000);
            } else if (errorMessage.includes('denied')) {
                new Notice('❌ Authorization was denied. Please try again if this was a mistake.', 5000);
            } else if (errorMessage.includes('Port') && errorMessage.includes('in use')) {
                new Notice('⚠️ Port 42813 is in use. Please close other applications and try again.', 5000);
            } else {
                new Notice(`❌ Authentication failed: ${errorMessage}`, 5000);
            }
        }
    }
}
