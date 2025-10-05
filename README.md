# Google Calendar Daily Notes - Obsidian Plugin

An Obsidian plugin that syncs your Google Calendar events to daily notes with automatic WikiLink formatting for meeting attendees.

## Features

- 📅 **Smart Date Detection**: Automatically shows events for the currently open daily note
  - When viewing `2025-10-03.md`, shows events for October 3rd, 2025
  - Falls back to today's events when not viewing a daily note
- 🔄 Auto-refresh events at configurable intervals
- 👥 Automatically format meeting attendees as WikiLinks
- 📝 One-click insertion of events into daily notes
- 🔒 Secure OAuth 2.0 authentication with Google Calendar
- 🔄 **Live Updates**: Calendar view updates automatically when switching between daily notes

## Usage

### Initial Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials (Desktop application type)

2. **Configure Plugin**
   - Open Obsidian Settings → Community Plugins → Google Calendar Daily Notes
   - Enter your Client ID and Client Secret
   - Copy the Redirect URI shown in settings: `http://localhost:42813`
   - Add this Redirect URI to your Google Cloud Console OAuth credentials

3. **Authenticate**
   - Click "Authenticate with Google" in plugin settings
   - A waiting modal appears in Obsidian
   - Your browser opens automatically to Google's authorization page
   - Grant permissions in your browser
   - You'll see a success page (auto-closes after 3 seconds)
   - Return to Obsidian - authentication completes automatically!
   - You should see "✅ Authenticated with Google Calendar"

### Daily Usage

1. **Open Calendar View**
   - Click the calendar icon in the left ribbon, or
   - Use Command Palette: "Open Today's Calendar"

2. **Navigate Between Daily Notes**
   - The calendar view **automatically updates** to show events for the currently open daily note
   - Open `2025-10-03.md` → See events for October 3rd
   - Open `2025-10-05.md` → See events for October 5th
   - Open a non-daily note → See today's events

3. **Insert Events into Notes**
   - Click any event in the calendar sidebar
   - The plugin will insert a formatted bullet point at your cursor position
   - Example outputs:
     - `- One on One with [[Cyrielle]]`
     - `- Weekly meeting with [[Jonas]], [[Moaad]] and [[Jonathan]]`

4. **Refresh Events**
   - Events auto-refresh every 5 minutes (configurable)
   - Manual refresh: Click the ↻ button in the calendar header
   - Use Command Palette: "Refresh Calendar Events"

## Settings

- **Client ID**: Your Google OAuth 2.0 Client ID
- **Client Secret**: Your Google OAuth 2.0 Client Secret
- **Redirect URI**: Fixed to `http://localhost:42813` (configure in Google Cloud Console)
- **Refresh Interval**: How often to refresh calendar events (default: 5 minutes)

## Event Formatting

The plugin formats events as bullet points with WikiLinks for attendees:

- **Single attendee**: `- Event Title with [[Person Name]]`
- **Two attendees**: `- Event Title with [[Person1]] and [[Person2]]`
- **Multiple attendees**: `- Event Title with [[Person1]], [[Person2]] and [[Person3]]`
- **No attendees**: `- Event Title`

Names are extracted from:
1. Display names (if available)
2. Email addresses (converted to proper names, e.g., `john.doe@example.com` → `John Doe`)

## Requirements

- Obsidian v0.15.0 or higher
- Google account with Calendar access
- Google Cloud project with Calendar API enabled

## Privacy & Security

- Authentication tokens are stored locally in Obsidian's plugin data
- Only read access to your calendar is requested
- No calendar data is sent to third-party servers
- OAuth tokens are refreshed automatically when expired

## Development

### Build from Source

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

### Installation for Development

1. Clone this repository to your Obsidian vault's plugins folder:
   ```
   /path/to/vault/.obsidian/plugins/google-calendar-daily-notes/
   ```
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start compilation in watch mode
4. Enable the plugin in Obsidian settings

## Troubleshooting

### "Failed to fetch calendar events"

- Check your internet connection
- Verify authentication in plugin settings
- Try clearing authentication and re-authenticating

### "No editor found in active view"

- Make sure you have a note open in edit mode
- Click into the note to ensure the editor has focus

### OAuth errors

- Verify your Client ID and Client Secret are correct
- Ensure the Redirect URI `http://localhost:42813` is added to your Google Cloud Console
- Make sure Google Calendar API is enabled in your project

## License

MIT

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/yourusername/google-calendar-daily-obsidian).
