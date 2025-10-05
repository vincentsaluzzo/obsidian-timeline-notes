import { App, WorkspaceLeaf, TFile, MarkdownView, WorkspaceItem } from 'obsidian';
import TimelineNotesPlugin from '../../main';

/**
 * Spawns an embedded workspace leaf in a container element
 * Creates a minimal WorkspaceSplit to host the leaf properly
 */
export function spawnLeafInContainer(
    plugin: TimelineNotesPlugin,
    containerEl: HTMLElement
): WorkspaceLeaf {
    // Create a minimal split container that won't be part of the main layout
    const split: any = {
        app: plugin.app,
        workspace: plugin.app.workspace,
        containerEl: containerEl,
        children: [],
        doc: document,
        win: window,

        getRoot() {
            return plugin.app.workspace.rootSplit;
        },

        getContainer() {
            return containerEl;
        },

        insertChild(index: number, child: WorkspaceItem, resize: boolean = true) {
            this.children.splice(index, 0, child);
            child.parent = this;

            // Append the child's container element
            if ((child as any).containerEl) {
                containerEl.appendChild((child as any).containerEl);
            }
        },

        removeChild(child: WorkspaceItem, resize: boolean = true) {
            const index = this.children.indexOf(child);
            if (index !== -1) {
                this.children.splice(index, 1);
                if ((child as any).containerEl) {
                    (child as any).containerEl.detach();
                }
            }
        },

        replaceChild(index: number, child: WorkspaceItem, resize: boolean = true) {
            const oldChild = this.children[index];
            if (oldChild && (oldChild as any).containerEl) {
                (oldChild as any).containerEl.detach();
            }
            this.children[index] = child;
            child.parent = this;
            if ((child as any).containerEl) {
                containerEl.appendChild((child as any).containerEl);
            }
        }
    };

    // Create a leaf using Obsidian's internal method
    // @ts-ignore - accessing internal API
    const leaf = plugin.app.workspace.createLeafInParent(split, 0);

    return leaf;
}

/**
 * Opens a file in an embedded leaf
 * Returns the container element that should have its min-height set
 */
export async function openFileInLeaf(
    leaf: WorkspaceLeaf,
    file: TFile,
    containerEl: HTMLElement,
    mode: 'source' | 'preview' = 'source'
): Promise<void> {
    await leaf.setViewState({
        type: 'markdown',
        state: {
            file: file.path,
            mode: mode,
            source: false,
            backlinks: false
        }
    });

    // Pin the leaf to prevent it from being replaced
    (leaf as any).setPinned?.(true);

    // Hide view header
    hideLeafHeader(leaf);

    // Configure the editor to auto-size based on content
    // Match Daily Notes Editor approach EXACTLY
    const timeout = window.setTimeout(() => {
        const view = leaf.view;
        if (view instanceof MarkdownView) {
            // @ts-ignore - Access CodeMirror editor via editMode
            const cm = view.editMode?.editor?.cm;
            if (cm && cm.dom) {
                // Use innerHeight exactly as Daily Notes Editor does
                const actualHeight = cm.dom.innerHeight;

                if (actualHeight > 0) {
                    // Apply this as min-height on the container
                    containerEl.style.minHeight = `${actualHeight}px`;
                    window.clearTimeout(timeout);
                }
            }
        }
    }, 400);
}

/**
 * Hides the header and actions from a leaf view
 */
export function hideLeafHeader(leaf: WorkspaceLeaf): void {
    const view = leaf.view;
    if (!view || !view.containerEl) return;

    // Hide header
    const header = view.containerEl.querySelector('.view-header');
    if (header instanceof HTMLElement) {
        header.style.display = 'none';
    }

    // Hide actions
    const actions = view.containerEl.querySelector('.view-actions');
    if (actions instanceof HTMLElement) {
        actions.style.display = 'none';
    }
}

/**
 * Properly detaches an embedded leaf
 */
export function detachEmbeddedLeaf(leaf: WorkspaceLeaf): void {
    try {
        leaf.detach();
    } catch (error) {
        console.error('Error detaching embedded leaf:', error);
    }
}
