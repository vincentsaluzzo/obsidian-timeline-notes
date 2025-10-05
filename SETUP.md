# Setup Guide - Google Calendar Daily Notes Plugin

## Quick Start

### 1. Install the Plugin in Obsidian

**Option A: Manual Installation (for development/testing)**
1. Copy this entire folder to your Obsidian vault's plugins directory:
   ```
   <YourVault>/.obsidian/plugins/google-calendar-daily-notes/
   ```
2. Restart Obsidian or reload community plugins
3. Enable "Google Calendar Daily Notes" in Settings → Community Plugins

**Option B: Development Mode**
1. Create a symlink from this directory to your vault's plugins folder:
   ```bash
   ln -s /Users/vincent.saluzzo/PERSONNEL/google-calendar-daily-obsidian <YourVault>/.obsidian/plugins/google-calendar-daily-notes
   ```
2. Restart Obsidian
3. Enable the plugin

### 2. Set Up Google Calendar API

#### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Name your project (e.g., "Obsidian Calendar Sync")

#### Enable Google Calendar API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

#### Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External (or Internal if using Google Workspace)
   - App name: Obsidian Calendar Sync
   - User support email: your email
   - Developer contact: your email
   - Scopes: You can skip this for now
   - Test users: Add your Google account email
4. Back to "Create OAuth client ID":
   - Application type: **Desktop app**
   - Name: Obsidian Plugin
5. Click "Create"
6. **Important**: Copy the Client ID and Client Secret

#### Configure Redirect URI

1. Click on your newly created OAuth client
2. Add this to "Authorized redirect URIs":
   ```
   http://localhost:42813
   ```
3. Save changes

### 3. Configure the Plugin in Obsidian

1. Open Obsidian Settings
2. Go to "Community Plugins" → "Google Calendar Daily Notes"
3. Enter your **Client ID** and **Client Secret**
4. Click "Authenticate with Google"
5. A waiting modal appears in Obsidian with a spinner
6. Your browser automatically opens to Google's authorization page
7. Log in with your Google account
8. Grant the requested permissions (read-only calendar access)
9. You'll see a beautiful success page in your browser (auto-closes after 3 seconds)
10. Return to Obsidian - authentication completes automatically!
11. You should see "✅ Authenticated with Google Calendar"

### 4. Using the Plugin

#### Open the Calendar View

- Click the calendar icon in the left ribbon, OR
- Use Command Palette (Cmd/Ctrl+P) → "Open Today's Calendar"

The calendar view will appear in the right sidebar showing today's events.

#### Insert Events into Your Daily Note

1. Open or create your daily note
2. Click any event in the calendar sidebar
3. The plugin will insert a formatted bullet point at your cursor position

**Example outputs:**
- `- One on One with [[Cyrielle]]`
- `- Weekly meeting with [[Jonas]], [[Moaad]] and [[Jonathan]]`

#### Tips

- Events auto-refresh every 5 minutes (configurable in settings)
- Click the ↻ button in the calendar header to manually refresh
- The plugin extracts attendee names and creates WikiLinks automatically
- Only other attendees are included (you are excluded)
- Names are extracted from display names or email addresses

### 5. Customization

#### Adjust Refresh Interval

In plugin settings, change "Refresh Interval" to set how often events refresh (in minutes).

#### Styling

The plugin uses CSS variables from your Obsidian theme. You can add custom CSS snippets to override styles if needed.

## Troubleshooting

### "Failed to fetch calendar events"

- Check your internet connection
- Verify you're authenticated (check plugin settings)
- Try clearing authentication and re-authenticating

### "No editor found in active view"

- Make sure you have a note open in edit mode
- Click into the note editor before clicking an event

### OAuth/Authentication Issues

- Double-check Client ID and Client Secret are correct
- Verify `http://localhost:42813` is in your Google Cloud Console redirect URIs
- Make sure Google Calendar API is enabled in your project
- If using Google Workspace, ensure the app is approved by your admin

### Build Issues (for developers)

If you need to rebuild:
```bash
npm install
npm run build
```

For development mode with hot reload:
```bash
npm run dev
```

## Security & Privacy

- Authentication tokens are stored locally in Obsidian's plugin data folder
- The plugin only requests **read-only** access to your calendar
- No data is sent to third-party servers
- All communication is directly between Obsidian and Google's servers

## File Structure

```
google-calendar-daily-obsidian/
├── main.js              # Compiled plugin (generated)
├── manifest.json        # Plugin metadata
├── styles.css          # UI styles
├── src/
│   ├── calendar/       # Google Calendar API integration
│   ├── ui/             # Obsidian UI components
│   └── utils/          # Helper functions
├── README.md           # Full documentation
└── SETUP.md           # This file
```

## Development

To modify the plugin:

1. Make changes to TypeScript files in `src/` or `main.ts`
2. Run `npm run dev` for automatic rebuilding
3. In Obsidian, use Command Palette → "Reload app without saving"

## Support

For issues or feature requests, please open an issue on the GitHub repository.

---

**Ready to start!** Follow steps 1-4 above to get your plugin up and running.
