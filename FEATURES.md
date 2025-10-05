# Feature Highlights

## 🎯 Smart Date Detection

The calendar view **automatically detects** which daily note you're viewing and shows events for that date!

### How It Works

1. **Open a daily note** with a date in the filename (e.g., `2025-10-03.md`)
2. **Calendar view updates automatically** to show events for October 3rd, 2025
3. **Switch to another daily note** (e.g., `2025-10-05.md`)
4. **Calendar updates instantly** to show events for October 5th

### Supported Filename Formats

The plugin recognizes various daily note naming patterns:

- ✅ `2025-10-03.md`
- ✅ `2025-10-03 Monday.md`
- ✅ `Monday 2025-10-03.md`
- ✅ `2025-10-03`
- ✅ Any format with `YYYY-MM-DD` pattern

### Fallback Behavior

- **Non-daily note** → Shows today's events
- **No file open** → Shows today's events
- **Invalid date format** → Shows today's events

## 📝 Example Workflow

```
1. Open today's daily note: 2025-10-05.md
   → Calendar shows: "Events for Today (2025-10-05)"
   → See: Team Standup, 1-on-1 with Alice, Client Call

2. Click "Team Standup" event
   → Inserts: "- Team Standup with [[Bob]], [[Alice]] and [[Charlie]]"

3. Navigate to yesterday: 2025-10-04.md
   → Calendar updates automatically
   → Shows: "Events for 2025-10-04"
   → See yesterday's events

4. Open project note: Project Alpha.md
   → Calendar shows: "Events for Today (2025-10-05)"
   → Falls back to today's events
```

## 🔄 Live Updates

The calendar view listens for file changes and updates automatically:

- **Switch tabs** → Updates instantly
- **Navigate with links** → Updates instantly
- **Open from file explorer** → Updates instantly
- **Use daily note commands** → Updates instantly

## 🎨 Visual Feedback

The header clearly indicates what date you're viewing:

- **Today**: `Events for Today (2025-10-05)`
- **Other dates**: `Events for 2025-10-03`
- **No events**: `No events on 2025-10-03` or `No events today`

## 🚀 Performance

- **Optimized**: Only fetches events when date changes
- **Cached**: Avoids unnecessary API calls
- **Efficient**: Uses Obsidian's native event system
- **Fast**: Updates happen instantly

## 💡 Use Cases

### 1. Review Past Meetings
Navigate to yesterday's daily note to see what meetings happened and add notes retroactively.

### 2. Plan Future Meetings
Open tomorrow's daily note to see upcoming meetings and prepare topics.

### 3. Weekly Review
Navigate through your daily notes for the week and see all meetings at a glance.

### 4. Multi-Day Planning
Keep the calendar view open while navigating between daily notes to see events for different days.

### 5. Meeting Retrospectives
Go back to old daily notes to see who attended past meetings and what was discussed.

## ⚙️ Technical Details

### Date Detection Logic

1. Get active file from workspace
2. Extract filename (without path or extension)
3. Parse date using regex pattern: `/(\d{4})-(\d{2})-(\d{2})/`
4. Validate date is valid (not Feb 31st, etc.)
5. Use parsed date or fallback to today

### Event Listeners

The view registers listeners for:
- `active-leaf-change` - When switching tabs
- `file-open` - When opening files

These ensure the view always shows events for the current context.

### Caching Strategy

- Stores current date in memory
- Only refreshes if date has changed
- Compares date strings, not object references
- Prevents duplicate API calls

---

## 🎉 Result

A seamless experience where your calendar events follow you as you navigate through your daily notes!
