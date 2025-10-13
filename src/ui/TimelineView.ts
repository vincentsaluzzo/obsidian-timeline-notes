import { ItemView, WorkspaceLeaf } from "obsidian";
import TimelineNotesPlugin from "../../main";
import { DailyNoteManager } from "../daily-notes/DailyNoteManager";
import { DaySection } from "./DaySection";

export const TIMELINE_VIEW_TYPE = "daily-timeline-view";

export class TimelineView extends ItemView {
  private plugin: TimelineNotesPlugin;
  private dailyNoteManager: DailyNoteManager;
  private daySections: Map<number, DaySection> = new Map();
  private scrollContainer: HTMLElement | null = null;
  private currentDayOffset: number = 0; // 0 = today, -1 = yesterday, +1 = tomorrow
  private visibleDays: number = 7; // Number of days to render at once
  private loadMoreThreshold: number = 500; // Pixels from edge to trigger load
  private intersectionObserver: IntersectionObserver | null = null;
  private currentVisibleDate: Date | null = null;
  private calendarPickerEl: HTMLElement | null = null;
  private isRendering: boolean = false;
  private focusedDayOffset: number | null = null; // Track manually focused day
  private lastFocusedDayOffset: number | null = null; // Track last focused day for external access
  private referenceDate: Date; // Fixed reference point for calculating offsets

  constructor(leaf: WorkspaceLeaf, plugin: TimelineNotesPlugin) {
    super(leaf);
    this.plugin = plugin;

    // Set reference date to today at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.referenceDate = today;

    // Initialize daily note manager
    this.dailyNoteManager = new DailyNoteManager(this.app, {
      folder: plugin.settings.dailyNotesFolder,
      dateFormat: plugin.settings.dailyNoteDateFormat,
      templatePath: plugin.settings.dailyNoteTemplate,
    });

    // Set up intersection observer for tracking visible days
    this.setupIntersectionObserver();
  }

  getViewType(): string {
    return TIMELINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Daily Timeline";
  }

  getIcon(): string {
    return "calendar-days";
  }

  async onOpen(): Promise<void> {
    // Reset reference date to actual current date when view opens
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.referenceDate = today;

    const container = this.containerEl;
    container.empty();
    container.addClass("timeline-view-container");

    // Add action button to the view header (top right)
    this.addAction("calendar-check", "Go to today", async () => {
      await this.scrollToToday();
    });

    // Create a fixed toolbar at the top
    const toolbar = container.createDiv({ cls: "timeline-toolbar" });

    // Calendar picker button
    const calendarButton = toolbar.createEl("button", {
      cls: "timeline-calendar-button",
    });
    // Create SVG icon using DOM API
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "3");
    rect.setAttribute("y", "4");
    rect.setAttribute("width", "18");
    rect.setAttribute("height", "18");
    rect.setAttribute("rx", "2");
    rect.setAttribute("ry", "2");
    svg.appendChild(rect);

    const line1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    line1.setAttribute("x1", "16");
    line1.setAttribute("y1", "2");
    line1.setAttribute("x2", "16");
    line1.setAttribute("y2", "6");
    svg.appendChild(line1);

    const line2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    line2.setAttribute("x1", "8");
    line2.setAttribute("y1", "2");
    line2.setAttribute("x2", "8");
    line2.setAttribute("y2", "6");
    svg.appendChild(line2);

    const line3 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    line3.setAttribute("x1", "3");
    line3.setAttribute("y1", "10");
    line3.setAttribute("x2", "21");
    line3.setAttribute("y2", "10");
    svg.appendChild(line3);

    calendarButton.appendChild(svg);
    calendarButton.addEventListener("click", (e) => {
      this.showCalendarPicker(e);
    });

    // Today button
    const todayButton = toolbar.createEl("button", {
      text: "Today",
      cls: "timeline-today-button",
    });
    todayButton.addEventListener("click", async () => {
      await this.scrollToToday();
    });

    // Create scroll container
    this.scrollContainer = container.createDiv({
      cls: "timeline-scroll-container",
    });

    // Initial render - show a few days before today, today, and days after
    await this.renderDays(-3, 6); // Show 3 days before, today (offset 0), and 6 days after

    // Immediately scroll to today (offset 0) to position it at the top
    // Use instant scroll (no smooth behavior) to avoid race conditions
    if (this.scrollContainer) {
      const todayElement = this.scrollContainer.querySelector(
        '[data-offset="0"]'
      ) as HTMLElement;
      if (todayElement) {
        const elementOffsetTop = todayElement.offsetTop;
        // Scroll to show the note from the very beginning
        this.scrollContainer.scrollTop = elementOffsetTop;
      }
    }

    // Manually trigger initial visible day change for today
    // Use a small delay to ensure all views are loaded (especially CalendarView)
    const todayDate = new Date(this.referenceDate);
    this.currentVisibleDate = todayDate;
    setTimeout(() => {
      this.onVisibleDayChanged(todayDate);
    }, 100);

    // Set up scroll listener
    this.scrollContainer.addEventListener("scroll", () => this.onScroll());

    // Set up click listener to detect when user focuses on a day's editor
    this.scrollContainer.addEventListener("click", (e) => {
      this.onEditorClick(e);
    });
  }

  async onClose(): Promise<void> {
    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Clean up all day sections
    this.daySections.forEach((section) => section.destroy());
    this.daySections.clear();
  }

  /**
   * Set up intersection observer to track which day is currently visible
   */
  private setupIntersectionObserver(): void {
    // Create intersection observer with threshold at the top of viewport
    this.intersectionObserver = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        // Check if the focused day is still visible
        if (this.focusedDayOffset !== null) {
          const focusedDayVisible = entries.some(
            (entry: IntersectionObserverEntry) => {
              if (entry.target) {
                const offset = parseInt(
                  (entry.target as HTMLElement).getAttribute("data-offset") ||
                    "0",
                  10
                );
                return offset === this.focusedDayOffset && entry.isIntersecting;
              }
              return false;
            }
          );

          // If the focused day is no longer visible, unlock
          if (!focusedDayVisible) {
            this.focusedDayOffset = null;
          } else {
            // Keep the focused day locked, don't update based on scroll
            return;
          }
        }

        // Find the entry that is most visible at the top
        // We want to find the day that is currently at the top of the viewport
        let topMostEntry: IntersectionObserverEntry | undefined;
        let closestToTop = Infinity;

        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting && entry.target) {
            const rect = entry.boundingClientRect;
            // Find the day that is closest to the top of the viewport
            // Use absolute value to handle both scrolling up and down
            const distanceFromTop = Math.abs(rect.top);

            // Prefer entries that are near the top (within 200px)
            if (distanceFromTop < closestToTop && rect.top < 200) {
              closestToTop = distanceFromTop;
              topMostEntry = entry;
            }
          }
        });

        if (topMostEntry) {
          // Find which day section this corresponds to
          const element = topMostEntry.target as HTMLElement;
          const offset = parseInt(
            element.getAttribute("data-offset") || "0",
            10
          );
          const section = this.daySections.get(offset);

          if (section) {
            const date = section.getDate();

            // Only trigger if date changed
            if (
              !this.currentVisibleDate ||
              date.toDateString() !== this.currentVisibleDate.toDateString()
            ) {
              this.currentVisibleDate = date;
              this.onVisibleDayChanged(date);
            }
          }
        }
      },
      {
        root: null, // Use viewport
        rootMargin: "0px 0px -90% 0px", // Trigger when day enters top 10% of viewport
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      }
    );
  }

  /**
   * Called when the visible day changes
   */
  private onVisibleDayChanged(date: Date): void {
    // Trigger event on plugin for other views to listen
    this.plugin.app.workspace.trigger("timeline-visible-day-changed", date);
  }

  /**
   * Handle clicks on editors to detect focused day
   */
  private onEditorClick(event: MouseEvent): void {
    // Find which day container was clicked
    const target = event.target as HTMLElement;
    const dayContainer = target.closest(
      ".timeline-day-container"
    ) as HTMLElement;

    if (dayContainer) {
      const offset = parseInt(
        dayContainer.getAttribute("data-offset") || "0",
        10
      );
      const section = this.daySections.get(offset);

      if (section) {
        const date = section.getDate();

        // Lock focus to this day
        this.focusedDayOffset = offset;
        this.lastFocusedDayOffset = offset;

        // Update current visible date and trigger change
        if (
          !this.currentVisibleDate ||
          date.toDateString() !== this.currentVisibleDate.toDateString()
        ) {
          this.currentVisibleDate = date;
          this.onVisibleDayChanged(date);
        }
      }
    }
  }

  /**
   * Handle scroll events to implement infinite scroll
   */
  private onScroll(): void {
    if (!this.scrollContainer) return;

    const scrollTop = this.scrollContainer.scrollTop;
    const scrollHeight = this.scrollContainer.scrollHeight;
    const clientHeight = this.scrollContainer.clientHeight;

    // Check if we're near the top (scroll up to load past days)
    if (scrollTop < this.loadMoreThreshold) {
      this.loadMorePast();
    }

    // Check if we're near the bottom (scroll down to load future days)
    if (scrollTop + clientHeight > scrollHeight - this.loadMoreThreshold) {
      this.loadMoreFuture();
    }
  }

  /**
   * Load more days in the past
   */
  private async loadMorePast(): Promise<void> {
    const currentMin = Math.min(...Array.from(this.daySections.keys()));
    const startOffset = currentMin - 3; // Load 3 more days
    const endOffset = currentMin - 1;

    await this.renderDays(startOffset, endOffset, "prepend");
  }

  /**
   * Load more days in the future
   */
  private async loadMoreFuture(): Promise<void> {
    const currentMax = Math.max(...Array.from(this.daySections.keys()));
    const startOffset = currentMax + 1;
    const endOffset = currentMax + 3; // Load 3 more days

    await this.renderDays(startOffset, endOffset, "append");
  }

  /**
   * Render days for a given offset range
   * @param startOffset - Starting day offset from today (e.g., -1 for yesterday)
   * @param endOffset - Ending day offset from today
   * @param mode - 'append' to add at end, 'prepend' to add at start, 'replace' to clear and add
   */
  private async renderDays(
    startOffset: number,
    endOffset: number,
    mode: "append" | "prepend" | "replace" = "replace"
  ): Promise<void> {
    if (!this.scrollContainer) return;

    // Prevent concurrent rendering
    if (this.isRendering && mode !== "replace") {
      return;
    }
    this.isRendering = true;

    try {
      if (mode === "replace") {
        // Clear existing sections
        this.daySections.forEach((section) => section.destroy());
        this.daySections.clear();
        this.scrollContainer.empty();
      }

      // Render days in order
      // For prepending, we need to iterate in reverse to maintain chronological order
      const offsets = [];
      for (let offset = startOffset; offset <= endOffset; offset++) {
        // Skip if already rendered
        if (!this.daySections.has(offset)) {
          offsets.push(offset);
        }
      }

      // Reverse for prepending so oldest days are at the top
      if (mode === "prepend") {
        offsets.reverse();
      }

      for (const offset of offsets) {
        const date = this.getDateFromOffset(offset);
        const dayContainer = this.scrollContainer.createDiv({
          cls: "timeline-day-container",
        });

        // Add data attribute for tracking
        dayContainer.setAttribute("data-offset", offset.toString());

        // Prepend or append based on mode
        if (mode === "prepend") {
          this.scrollContainer.insertBefore(
            dayContainer,
            this.scrollContainer.firstChild
          );
        }

        const daySection = new DaySection(
          dayContainer,
          date,
          this.plugin,
          this.dailyNoteManager
        );
        await daySection.render();

        this.daySections.set(offset, daySection);

        // Observe this element with intersection observer
        if (this.intersectionObserver) {
          this.intersectionObserver.observe(dayContainer);
        }
      }
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Get a Date object for a given offset from the reference date
   */
  private getDateFromOffset(offset: number): Date {
    const date = new Date(this.referenceDate);
    date.setDate(date.getDate() + offset);
    return date;
  }

  /**
   * Scroll to a specific day offset
   */
  scrollToDay(offset: number): void {
    const section = this.daySections.get(offset);
    if (section && this.scrollContainer) {
      const dayElement = this.scrollContainer.querySelector(
        `[data-offset="${offset}"]`
      ) as HTMLElement;
      if (dayElement) {
        // Position the day title close to the top of the view
        // offsetTop is relative to the scroll container's padding area
        const elementOffsetTop = dayElement.offsetTop;

        // Scroll with minimal space from top (10px) to position day title near the top
        this.scrollContainer.scrollTo({
          top: elementOffsetTop - 10,
          behavior: "smooth",
        });
      }
    }
  }

  /**
   * Scroll to today (dynamically calculated)
   */
  async scrollToToday(): Promise<void> {
    // Instead of assuming offset 0 is today, navigate to the actual current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.goToDate(today);
  }

  /**
   * Show calendar picker popup
   */
  private showCalendarPicker(event: MouseEvent): void {
    event.stopPropagation();

    // If picker is already open, close it
    if (this.calendarPickerEl) {
      this.calendarPickerEl.remove();
      this.calendarPickerEl = null;
      return;
    }

    // Create popup
    this.calendarPickerEl = document.body.createDiv({
      cls: "timeline-calendar-picker",
    });

    // Get the button element (might be the SVG or the button itself)
    let buttonEl = event.target as HTMLElement;
    if (
      buttonEl.tagName === "svg" ||
      buttonEl.tagName === "line" ||
      buttonEl.tagName === "rect"
    ) {
      buttonEl = buttonEl.closest("button") as HTMLElement;
    }

    // Position near the button
    const buttonRect = buttonEl.getBoundingClientRect();
    this.calendarPickerEl.style.setProperty(
      "--picker-top",
      `${buttonRect.bottom + 5}px`
    );
    this.calendarPickerEl.style.setProperty(
      "--picker-left",
      `${buttonRect.left}px`
    );

    // Render calendar
    this.renderCalendarPicker(new Date());

    // Close when clicking outside
    const closeOnClickOutside = (e: MouseEvent) => {
      if (
        this.calendarPickerEl &&
        !this.calendarPickerEl.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(".timeline-calendar-button")
      ) {
        this.closeCalendarPicker();
        document.removeEventListener("click", closeOnClickOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", closeOnClickOutside);
    }, 0);
  }

  /**
   * Close calendar picker
   */
  private closeCalendarPicker(): void {
    if (this.calendarPickerEl) {
      this.calendarPickerEl.remove();
      this.calendarPickerEl = null;
    }
  }

  /**
   * Render calendar picker for a given month
   */
  private renderCalendarPicker(currentMonth: Date): void {
    if (!this.calendarPickerEl) return;

    this.calendarPickerEl.empty();

    // Header with month navigation
    const header = this.calendarPickerEl.createDiv({
      cls: "calendar-picker-header",
    });

    const prevBtn = header.createEl("button", {
      text: "‹",
      cls: "calendar-nav-btn",
    });
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const prevMonth = new Date(currentMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      this.renderCalendarPicker(prevMonth);
    });

    const monthLabel = header.createEl("span", {
      text: currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      cls: "calendar-month-label",
    });

    const nextBtn = header.createEl("button", {
      text: "›",
      cls: "calendar-nav-btn",
    });
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      this.renderCalendarPicker(nextMonth);
    });

    // Day names
    const dayNames = this.calendarPickerEl.createDiv({
      cls: "calendar-day-names",
    });
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((day) => {
      dayNames.createEl("div", { text: day, cls: "calendar-day-name" });
    });

    // Days grid
    const daysGrid = this.calendarPickerEl.createDiv({
      cls: "calendar-days-grid",
    });

    // Get first day of month and total days
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const lastDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );
    const firstDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysGrid.createDiv({ cls: "calendar-day-cell empty" });
    }

    // Day cells
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      date.setHours(0, 0, 0, 0);

      const dayCell = daysGrid.createEl("button", {
        text: day.toString(),
        cls: "calendar-day-cell",
      });

      // Highlight today
      if (date.getTime() === today.getTime()) {
        dayCell.addClass("today");
      }

      dayCell.addEventListener("click", async (e) => {
        e.stopPropagation();

        // Close the picker first
        this.closeCalendarPicker();

        // Navigate to the date
        await this.goToDate(date);
      });
    }
  }

  /**
   * Navigate to a specific date
   */
  private async goToDate(targetDate: Date): Promise<void> {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    // Update the reference date to the new target date
    // This recenters the offset system around the new date
    this.referenceDate = new Date(target);

    // Completely reload the view with the selected date at the top (offset 0)
    // Render 3 days before, the selected day, and 6 days after
    await this.renderDays(-3, 6, "replace");

    // Immediately scroll to the selected date (offset 0) to position it at the top
    // Use instant scroll (no smooth behavior) to avoid race conditions
    if (this.scrollContainer) {
      const targetElement = this.scrollContainer.querySelector(
        '[data-offset="0"]'
      ) as HTMLElement;
      if (targetElement) {
        const elementOffsetTop = targetElement.offsetTop;
        // Scroll to show the note from the very beginning
        this.scrollContainer.scrollTop = elementOffsetTop;
      }
    }

    // Update the visible date
    this.currentVisibleDate = target;
    this.onVisibleDayChanged(target);
  }

  /**
   * Update daily note manager configuration
   */
  updateConfig(): void {
    this.dailyNoteManager.updateConfig({
      folder: this.plugin.settings.dailyNotesFolder,
      dateFormat: this.plugin.settings.dailyNoteDateFormat,
      templatePath: this.plugin.settings.dailyNoteTemplate,
    });
  }

  /**
   * Get the last focused day's editor
   * Used by external views (like CalendarView) to insert content
   */
  getLastFocusedEditor() {
    if (this.lastFocusedDayOffset !== null) {
      const section = this.daySections.get(this.lastFocusedDayOffset);
      if (section) {
        return section.getEditor();
      }
    }
    return null;
  }
}
