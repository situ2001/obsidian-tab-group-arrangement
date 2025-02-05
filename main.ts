import { Plugin, WorkspaceItem, WorkspaceLeaf, WorkspaceSplit, WorkspaceTabs } from 'obsidian';

export default class EditorGroupArrangementPlugin extends Plugin {
  static MIN_HEIGHT_PX = 80;
  static MIN_WIDTH_PX = 200;

  /**
   * if the active editor group is expanded, there is a tab node that has width or height > 200px
  */
  private _isExpandedGroup: boolean = false;

  async onload() {
    console.log("obsidian-editor-group-arrangement-plugin loaded");
    this._registerCommands();
    this._registerEventListeners();
  }

  async onunload() {
    console.log("obsidian-editor-group-arrangement-plugin unloaded");
  }

  private _registerCommands() {
    this.addCommand({
      id: 'arrange-editor-groups-evenly',
      name: 'Arrange Evenly',
      callback: () => {
        this._arrangeEvenly();
      },
      hotkeys: []
    });

    this.addCommand({
      id: 'arrange-editor-groups-expand-active',
      name: 'Expand Active Editor',
      callback: () => {
        this._expandActiveLeaf();
      },
      hotkeys: []
    });

    this.addCommand({
      id: 'arrange-editor-groups-toggle-expand',
      name: 'Toggle Expand Active Editor',
      callback: () => {
        if (this._isExpandedGroup) {
          this._arrangeEvenly();
        } else {
          this._expandActiveLeaf();
        }
      },
      hotkeys: [],
    })

    // TODO feature to be implemented in the future
    // this.addCommand({
    //   id: 'arrange-editor-groups-collapse-maximize-active',
    //   name: 'Maximize Active Editor',
    //   callback: () => {
    //     // TODO
    //   },
    //   hotkeys: []
    // })
  }

  private _registerEventListeners() {
    this.registerDomEvent(document, 'click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.mod-root')) return;

      if (this._isExpandedGroup) {
        const closestElem = target.closest('.workspace-tab-header')
        if (closestElem) {
          this._expandActiveLeaf();
        }
      }
    });

    // TODO buggy: when we double on tab, the electron window will resize before the plugin can handle the event, and we cannot prevent it
    // this.registerDomEvent(document, 'dblclick', (event) => {
    //   const target = event.target as HTMLElement;
    //   if (!target.closest('.mod-root')) return;

    //   // check if it is in or is a tab item. class name of tab item is "workspace-tab-header" and "tappable"
    //   const closestElem = target.closest('.workspace-tab-header')
    //   if (closestElem) {
    //     // to prevent the default behavior of double click, which is to resize the window
    //     event.stopPropagation();
    //     event.preventDefault();

    //     this._toggleExpand();
    //   }
    // });

    this.app.workspace.on('active-leaf-change', (leaf) => {
      // TODO buggy, it you create a new split node from tab node that exists in other split, it will not work. Since the active leaf is not changed...
      // FIXME: maybe we can listen to layout-change event
      if (this._isExpandedGroup && leaf) {
        this._expandActiveLeaf(leaf);
      }
    });

    this.registerDomEvent(window, 'resize', () => {
      if (this._isExpandedGroup) {
        this._expandActiveLeaf();
      }
    })
  }

  private _collectedNonLeafNodes() {
    const collectedNonLeafNodes: Set<WorkspaceItem> = new Set();
    this.app.workspace.iterateRootLeaves((leaf) => {
      let parent = leaf.parent;

      while (parent) {
        if (parent === this.app.workspace.rootSplit) {
          break;
        }
        if (collectedNonLeafNodes.has(parent)) {
          break;
        }

        collectedNonLeafNodes.add(parent);

        parent = parent.parent;
      }
    });

    return collectedNonLeafNodes;
  }

  /**
   * Ideas: remove all flex-grow style from node with type "tabs" and "split"
   */
  private _arrangeEvenly() {
    const collectedNonLeafNodes = this._collectedNonLeafNodes();

    collectedNonLeafNodes.forEach((node) => {
      // @ts-ignore. Since it is a private property
      const el = node.containerEl as HTMLElement;
      if (!el) return;
      el.style.flexGrow = '';
    });

    this._isExpandedGroup = false;
  }

  /**
   * Ideas: get the path ascendants of a node (not including the root node)
   */
  private _getPathAscendants(node: WorkspaceLeaf): Array<WorkspaceItem> {
    const pathAscendants: Array<WorkspaceItem> = [];
    let parent = node.parent;
    while (parent) {
      if (parent === this.app.workspace.rootSplit) {
        break;
      }

      pathAscendants.push(parent);
      parent = parent.parent;
    }

    return pathAscendants;
  }

  private _isLeafUnderRootSplit(leaf: WorkspaceItem): boolean {
    let parent = leaf.parent;
    while (parent) {
      if (parent === this.app.workspace.rootSplit) {
        return true;
      }
      parent = parent.parent;
    }

    return false;
  }

  /**
   * Ideas: enlarge the active editor group and shrink the rest to a minimum size
   * 
   * in this scenario, editor group is a split node or a tab node
   * 
   * TODO: what is the minimum size?
   */
  private _expandActiveLeaf(leaf?: WorkspaceLeaf) {
    const activeLeaf = leaf || this.app.workspace.activeLeaf;
    if (!activeLeaf) return;
    if (!this._isLeafUnderRootSplit(activeLeaf)) return;

    const rootNode = this.app.workspace.rootSplit;
    const minSizeMap = new Map<WorkspaceItem, [number, number]>();
    const doRecurForSizeCalculation = (root: WorkspaceItem) => {
      if (root instanceof WorkspaceSplit) {
        // @ts-ignore Since it is a private property
        const children = root.children;
        for (const child of children) {
          const [width, height] = doRecurForSizeCalculation(child);
          minSizeMap.set(child, [width, height]);
        }

        // get horizontal or vertical split, then calculate the minimum size for this split node itself
        // @ts-ignore Since it is a private property
        const isVertical = root.direction === "vertical";
        // @ts-ignore Since it is a private property
        const isHorizontal = root.direction === "horizontal";

        let res = [0, 0];
        for (const child of children) {
          const [width, height] = minSizeMap.get(child)!;
          if (isVertical) {
            res = [res[0] + width, Math.max(res[1], height)];
          } else if (isHorizontal) {
            res = [Math.max(res[0], width), res[1] + height];
          } else {
            throw new Error('Unexpected direction');
          }
        }
        return res;
      }
      // reach the bottom, time to return. Here, we ensure bottom is a tab node
      if (!(root instanceof WorkspaceTabs)) throw new Error('Unexpected node type');
      return [EditorGroupArrangementPlugin.MIN_WIDTH_PX, EditorGroupArrangementPlugin.MIN_HEIGHT_PX];
    }
    const rootSize = doRecurForSizeCalculation(rootNode);
    minSizeMap.set(rootNode, [rootSize[0], rootSize[1]]);


    const pathAscendants = this._getPathAscendants(activeLeaf);
    const doRecurForResize = (root: WorkspaceItem) => {
      if (!(root instanceof WorkspaceSplit)) return;

      // @ts-ignore Since it is a private property
      const children = root.children;
      // @ts-ignore Since it is a private property
      const containerEl = root.containerEl as HTMLElement;

      // get container size
      const containerSize = containerEl.getBoundingClientRect();
      let containerWidth = containerSize.width;
      let containerHeight = containerSize.height;

      // get horizontal or vertical split, then calculate the minimum size for this split node itself
      // @ts-ignore Since it is a private property
      const isVertical = root.direction === "vertical";
      // @ts-ignore Since it is a private property
      const isHorizontal = root.direction === "horizontal";

      // calc ratio between non-pathAscendants and pathAscendants
      let weightOrHeight = 0;
      for (const child of children) {
        if (pathAscendants.includes(child)
          || child instanceof WorkspaceLeaf) {
          continue;
        }

        const [width, height] = minSizeMap.get(child)!;
        if (isVertical) {
          weightOrHeight += width;
        } else if (isHorizontal) {
          weightOrHeight += height;
        } else {
          throw new Error('Unexpected direction');
        }
      }

      let weightOrHeightPathNode = 0;
      if (isVertical) {
        weightOrHeightPathNode = containerWidth - weightOrHeight;
      } else if (isHorizontal) {
        weightOrHeightPathNode = containerHeight - weightOrHeight;
      } else {
        throw new Error('Unexpected direction');
      }

      // calculate the ratio between pathAscendants and non-pathAscendants
      let flexGrowForPathNode = 100 * weightOrHeightPathNode / (weightOrHeightPathNode + weightOrHeight);
      let flexGrowForEachNonPathNode = (100 * weightOrHeight / (weightOrHeightPathNode + weightOrHeight)) / Math.max(children.length - 1, 1);

      // set flexGrow for each child
      for (const child of children) {
        const containerEl = child.containerEl as HTMLElement;
        if (pathAscendants.includes(child)) {
          containerEl.style.flexGrow = flexGrowForPathNode.toString();
        } else {
          containerEl.style.flexGrow = flexGrowForEachNonPathNode.toString();
        }
        doRecurForResize(child);
      }
    }

    // TODO if small root split is small, we need to handle it differently
    doRecurForResize(rootNode);

    this._isExpandedGroup = true;
  }
}
