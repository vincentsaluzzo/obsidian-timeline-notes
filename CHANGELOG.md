# Changelog

## Version 1.0.0 - Initial Release

### Features

#### Core Functionality
- ✅ **Google Calendar Integration**: Sync with Google Calendar API v3
- ✅ **Smart Date Detection**: Automatically shows events for currently open daily note
  - Detects date from daily note filename (e.g., `2025-10-03.md`)
  - Supports various formats: `YYYY-MM-DD`, `YYYY-MM-DD.md`, `YYYY-MM-DD Day.md`, etc.
  - Falls back to today's events when not viewing a daily note
- ✅ **Live Updates**: Calendar view updates automatically when switching between daily notes
- ✅ **Right Sidebar View**: Display events in a dedicated panel
- ✅ **One-Click Insert**: Click any event to insert into daily note
- ✅ **WikiLink Formatting**: Automatically format attendees as WikiLinks
  - Example: `- Weekly meeting with [[Jonas]], [[Moaad]] and [[Jonathan]]`
- ✅ **Auto-Refresh**: Events refresh every 5 minutes (configurable)

#### Authentication
- ✅ **Automatic OAuth Flow**: No copy/paste needed!
  - Local HTTP server captures OAuth callback automatically
  - Beautiful success/error pages in browser
  - 60-second timeout with cancel option
  - Automatic cleanup after authentication
- ✅ **Secure Token Storage**: Tokens stored locally in Obsidian's plugin data
- ✅ **Refresh Token Support**: Long-term authentication without re-auth

#### User Experience
- ✅ **Clean UI**: Modern, themed interface matching Obsidian
- ✅ **Dynamic Header**: Shows "Events for Today" or "Events for [date]" based on active note
- ✅ **Loading States**: Spinner and clear status messages
- ✅ **Error Handling**: Helpful error messages for common issues
- ✅ **Ribbon Icon**: Quick access from sidebar
- ✅ **Command Palette**: "Open Today's Calendar" and "Refresh Calendar Events"
- ✅ **File Change Detection**: Automatically updates when switching between daily notes

#### Smart Formatting
- ✅ **Name Extraction**: Extracts names from display names or emails
  - `john.doe@example.com` → `John Doe`
- ✅ **Natural Language**: Proper formatting with commas and "and"
  - Single: `with [[Person]]`
  - Two: `with [[Person1]] and [[Person2]]`
  - Multiple: `with [[Person1]], [[Person2]] and [[Person3]]`
- ✅ **Self-Exclusion**: You are automatically excluded from attendee list
- ✅ **All-Day Events**: Proper handling of all-day events

### Technical Implementation

#### Architecture
- **TypeScript**: Fully typed codebase
- **Modular Design**: Separated concerns (Auth, API, UI, Utils)
- **Node.js HTTP Server**: Built-in `http` module for OAuth callbacks
- **Google APIs**: Official googleapis Node.js client library

#### File Structure
```
src/
├── calendar/
│   ├── AuthManager.ts          # OAuth 2.0 authentication
│   ├── OAuthCallbackServer.ts  # Local HTTP server for callbacks
│   └── GoogleCalendarAPI.ts    # Calendar API integration
├── ui/
│   ├── CalendarView.ts         # Right sidebar panel
│   └── SettingsTab.ts          # Settings and auth UI
└── utils/
    ├── DateUtils.ts            # Date/time helpers
    └── WikiLinkFormatter.ts    # Attendee formatting
```

### Configuration
- Client ID and Client Secret (from Google Cloud Console)
- Redirect URI: `http://localhost:42813`
- Refresh Interval: 5 minutes (configurable)

### Known Limitations
- Desktop only (requires Node.js HTTP server)
- Requires port 42813 to be available during authentication
- Only fetches from primary calendar
- Read-only access (no event creation/modification)

### Future Enhancements (Potential)
- Multiple calendar support
- Custom date range selection
- Event filtering by calendar/type
- Custom WikiLink format templates
- Sync status indicators
- Manual refresh button in view
- Event details popup
- Time zone handling improvements

---

## Development Notes

### Build
```bash
npm install
npm run build    # Production build
npm run dev      # Development with watch mode
```

### Dependencies
- `obsidian`: Obsidian plugin API
- `googleapis`: Google Calendar API client
- Built-in Node.js modules: `http`, `url`

### OAuth Flow
1. User clicks "Authenticate with Google"
2. Local HTTP server starts on port 42813
3. Browser opens to Google authorization page
4. User authorizes
5. Google redirects to `http://localhost:42813/?code=...`
6. Server captures code, sends success page
7. Code exchanged for access/refresh tokens
8. Server shuts down
9. Tokens stored in plugin settings

### Security
- Tokens stored locally only
- Read-only calendar scope
- No data sent to third parties
- OAuth 2.0 standard flow
- Automatic token refresh

---

**Built with ❤️ for Obsidian**
