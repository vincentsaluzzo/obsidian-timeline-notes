import {
  MarkdownView,
  Notice,
  TFile,
  WorkspaceLeaf,
  Component,
} from "obsidian";
import { DailyNoteManager } from "../daily-notes/DailyNoteManager";
import { DateUtils } from "../utils/DateUtils";
import TimelineNotesPlugin from "../../main";
import {
  spawnLeafInContainer,
  openFileInLeaf,
  detachEmbeddedLeaf,
} from "../utils/EmbeddedLeaf";

export class DaySection extends Component {
  private container: HTMLElement;
  private date: Date;
  private plugin: TimelineNotesPlugin;
  private dailyNoteManager: DailyNoteManager;
  private content: string = "";
  private file: TFile | null = null;
  private embeddedLeaf: WorkspaceLeaf | null = null;
  private dayContainer: HTMLElement | null = null;
  private editorContainer: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    date: Date,
    plugin: TimelineNotesPlugin,
    dailyNoteManager: DailyNoteManager
  ) {
    super();
    this.container = container;
    this.date = date;
    this.plugin = plugin;
    this.dailyNoteManager = dailyNoteManager;
  }

  /**
   * Get the date for this section
   */
  getDate(): Date {
    return this.date;
  }

  /**
   * Get the container element
   */
  getContainer(): HTMLElement {
    return this.dayContainer || this.container;
  }

  /**
   * Render the day section
   */
  async render(): Promise<void> {
    this.container.empty();
    this.dayContainer = this.container;

    // Check if note exists
    const exists = await this.dailyNoteManager.exists(this.date);

    // Load or create file
    if (exists) {
      this.file = await this.dailyNoteManager.getFile(this.date);
    } else {
      // Create file with 10 line breaks for better initial spacing
      const initialContent = "\n".repeat(10);
      this.file = await this.dailyNoteManager.create(this.date, initialContent);
    }

    if (!this.file) {
      new Notice(
        `Failed to load file for ${DateUtils.formatDateString(this.date)}`
      );
      return;
    }

    // Create editor area
    this.editorContainer = this.container.createDiv({
      cls: "timeline-day-editor",
    });

    // Create embedded editor
    await this.createEmbeddedEditor();
  }

  /**
   * Create an embedded markdown editor
   */
  private async createEmbeddedEditor(): Promise<void> {
    if (!this.file || !this.editorContainer) {
      console.error("Missing file or container", {
        file: this.file,
        container: this.editorContainer,
      });
      return;
    }

    try {
      // Spawn an embedded leaf in the container
      this.embeddedLeaf = spawnLeafInContainer(
        this.plugin,
        this.editorContainer
      );

      if (!this.embeddedLeaf) {
        throw new Error("Failed to spawn leaf");
      }

      // Open the file in the embedded leaf
      // Pass the container so it can set min-height on it
      await openFileInLeaf(
        this.embeddedLeaf,
        this.file,
        this.editorContainer,
        "source"
      );
    } catch (error) {
      console.error(
        "Error creating embedded editor for",
        this.date.toDateString(),
        error
      );

      // Fallback: show error and allow opening in new tab
      this.editorContainer.empty();
      const errorEl = this.editorContainer.createDiv({
        text: "Failed to load editor. Click to open in new tab.",
        cls: "timeline-editor-error",
      });

      errorEl.addEventListener("click", async () => {
        if (this.file) {
          const leaf = this.plugin.app.workspace.getLeaf("tab");
          await leaf.openFile(this.file);
        }
      });
    }
  }

  /**
   * Format date for header display
   */
  private formatDateHeader(date: Date): string {
    // Use the same format as the filename
    const dateStr = this.dailyNoteManager
      .getFilenameForDate(date)
      .replace(".md", "");
    return dateStr;
  }

  /**
   * Get the current content
   */
  getContent(): string {
    if (this.embeddedLeaf && this.embeddedLeaf.view instanceof MarkdownView) {
      return this.embeddedLeaf.view.editor.getValue();
    }
    return this.content;
  }

  /**
   * Get the embedded editor if available
   */
  getEditor() {
    if (this.embeddedLeaf && this.embeddedLeaf.view instanceof MarkdownView) {
      return this.embeddedLeaf.view.editor;
    }
    return null;
  }

  /**
   * Clean up
   */
  destroy(): void {
    // Detach the embedded leaf
    if (this.embeddedLeaf) {
      detachEmbeddedLeaf(this.embeddedLeaf);
      this.embeddedLeaf = null;
    }

    // Call parent cleanup
    super.unload();
  }
}
