# Daily Timeline View - Feature Documentation

## Overview

The **Daily Timeline View** is an infinite scroll interface that allows you to browse, view, and edit daily notes across multiple days in a single continuous view.

## Features

### ✨ Key Capabilities

1. **Infinite Scroll**
   - Scroll down → Future days (tomorrow, day after, etc.)
   - Scroll up → Past days (yesterday, day before, etc.)
   - Starts at today
   - Loads days dynamically as you scroll

2. **Smart Note Handling**
   - Shows ALL days (not just days with existing notes)
   - If note exists → Loads content from file
   - If note doesn't exist → Shows empty editor with "📄" indicator
   - Updates indicator to "📝" when note is created

3. **Real-time Editing**
   - Edit any day's content directly in the timeline
   - Auto-saves after 500ms of inactivity
   - Creates note file on first keystroke if it doesn't exist
   - Two-way sync with actual note files

4. **Date Display**
   - Today: "📍 TODAY - Wednesday, October 3, 2025"
   - Yesterday: "← Yesterday - Tuesday, October 2, 2025"
   - Tomorrow: "→ Tomorrow - Thursday, October 4, 2025"
   - Other days: Shows day name, date, and days offset

## How to Use

### Opening the Timeline View

**Method 1: Ribbon Icon**
- Click the 📅 `calendar-days` icon in the left sidebar
- View opens in center pane

**Method 2: Command Palette**
- Press `Cmd/Ctrl + P`
- Type "Open Daily Timeline"
- Press Enter

### Navigating Days

1. **Scroll Down** - View future days
2. **Scroll Up** - View past days
3. Timeline loads 3 more days at a time as you approach the edge

### Editing Notes

1. Click into any day's text area
2. Start typing
3. Content auto-saves after 500ms
4. If note doesn't exist, it's created automatically
5. Indicator changes from 📄 (new) to 📝 (exists)

## Configuration

### Settings Location

Go to: **Settings → Community Plugins → Google Calendar Daily Notes**

### Available Settings

#### Daily Notes Folder
- **Default**: `""` (vault root)
- **Example**: `daily` or `journal/daily-notes`
- Where daily note files are stored

#### Date Format
- **Default**: `YYYY-MM-DD`
- Format for daily note filenames
- Examples:
  - `YYYY-MM-DD` → `2025-10-03.md`
  - Custom formats supported

#### Template File
- **Default**: `""` (none)
- **Example**: `templates/daily-note.md`
- Optional template for new daily notes
- Template variables supported:
  - `{{date}}` - Date in YYYY-MM-DD format
  - `{{day}}` - Day of week (Monday, Tuesday, etc.)
  - `{{month}}` - Month name (October, November, etc.)
  - `{{year}}` - Year (2025)

## Technical Details

### File Structure

```
src/daily-notes/
├── DailyNoteManager.ts    # File operations (create, save, load)

src/ui/
├── TimelineView.ts         # Main timeline view with infinite scroll
└── DaySection.ts           # Individual day component with editor
```

### Architecture

**TimelineView**
- ItemView that opens in center pane
- Manages infinite scroll logic
- Renders 7 days initially (-3 to +3 from today)
- Loads 3 more days when scrolling near edges
- Virtual scrolling for performance

**DaySection**
- Represents one day
- Contains date header, indicator, and text editor
- Auto-saves content after 500ms debounce
- Creates file on first edit if doesn't exist

**DailyNoteManager**
- Handles all file operations
- Creates daily note files
- Loads and saves content
- Ensures folders exist
- Processes templates

### Auto-save Behavior

- **Trigger**: 500ms after last keystroke
- **Action**: Saves to file automatically
- **Create**: If file doesn't exist, creates it on first save
- **Indicator**: Updates from 📄 to 📝 after creation

### Infinite Scroll Algorithm

1. **Initial Load**: Renders days -3 to +3 (7 days total)
2. **Scroll Detection**: Monitors scroll position
3. **Load Threshold**: 500px from edge
4. **Load More Past**: When near top, loads 3 days before earliest
5. **Load More Future**: When near bottom, loads 3 days after latest
6. **Performance**: Only rendered days consume resources

## Integration with Calendar View

### Complementary Features

- **Timeline View** (center): Browse and edit multiple days
- **Calendar View** (right sidebar): See events for current day
- Both work together seamlessly

### Event Insertion

When you click a calendar event while timeline is open:
- Event inserts into the most recent markdown editor
- Can be the timeline's focused day editor
- Smart context detection finds the right editor

## User Interface

### Day Header

```
┌────────────────────────────────────────────┐
│  📍 TODAY - Wednesday, October 3, 2025  📝 │
└────────────────────────────────────────────┘
```

- Left: Day description
- Right: Status indicator (📝 exists / 📄 new)

### Editor Area

- Full-width text area
- Minimum 300px height
- Resizable vertically
- Monospace font option
- Syntax highlighting (future)

### Visual Design

- Cards with shadows for each day
- 40px margin between days
- Smooth scrolling
- Theme-aware colors
- Focus states on editors

## Keyboard Shortcuts

(Future enhancement)
- `j` - Jump to next day
- `k` - Jump to previous day
- `t` - Jump to today
- `Cmd/Ctrl + S` - Force save current day

## Known Limitations

1. **Simple Editor**: Currently uses textarea, not full Obsidian editor
   - Future: Integrate CodeMirror or Obsidian's native editor
2. **No Syntax Highlighting**: Markdown not rendered
   - Future: Add live preview option
3. **No Backlinks**: Doesn't show backlinks in timeline
   - Future: Add backlinks panel
4. **No Search**: Can't search across timeline
   - Future: Add search bar

## Future Enhancements

### Planned Features

- [ ] Full Obsidian editor integration (CodeMirror)
- [ ] Live preview mode toggle
- [ ] Jump to specific date
- [ ] Search within timeline
- [ ] Week/month view options
- [ ] Keyboard navigation (j/k)
- [ ] Mini-map overview
- [ ] Template variable expansion
- [ ] File watcher for external changes
- [ ] Undo/redo support
- [ ] Drag-and-drop between days

## Troubleshooting

### Timeline doesn't load

- Check settings: Daily Notes Folder path is correct
- Ensure folder exists or plugin can create it
- Check browser console for errors

### Notes not saving

- Verify folder permissions
- Check if folder path is valid
- Look for file conflicts

### Can't create new notes

- Ensure daily notes folder exists
- Check folder path doesn't have typos
- Verify date format is valid

### Scroll not loading more days

- Scroll closer to edge (within 500px)
- Check console for errors
- Refresh view by closing and reopening

## Best Practices

1. **Folder Organization**: Keep daily notes in dedicated folder
2. **Naming Convention**: Stick with YYYY-MM-DD format
3. **Templates**: Use templates for consistent structure
4. **Regular Saves**: Content auto-saves, but close gracefully
5. **Integration**: Use alongside calendar view for full experience

---

**Built with ❤️ for Obsidian**
