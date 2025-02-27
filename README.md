# obsidian-tab-group-arrangement

> Arrange your tab group in a more flexible way.

![screenshots](./screen-recording.gif)

## Introduction

This is a plugin for [Obsidian](https://obsidian.md/), which provides a way to arrange the tab group in a more flexible way. Currently, the plugin supports the following features:

- Arrange action
  - Arrange evenly: this action will arrange the tab group evenly.
  - Expand active tab group: this action will expand the active tab group, and shrink the other editors to the minimum size. Just like what vscode does.
- Arrange Mode
  - Manual: Do nothing.
  - Auto Expand: Automatically expand the active tab group when the active tab group is changed or when you click on the editor tab.

## How to use

1. Install and enable the plugin.
2. Then you can make actions and switch modes from
   1. The status bar. You can find a clickable icon with tooltip `Tab Group Arrangement` when you hover on it.
   2. The command palette. Just type `Tab Group Arrangement` and you will find the commands.
3. Enjoy!

## Limitations

- The plugin is still in the early stage, so there might be some bugs.
- In some cases, after switching mode to auto expand, you should *change the active tab group* or click on the editor tab to trigger the expand action.
- Since double click on tab of editor will cause Obsidian window to maximize, the plugin does not support double click on tab to expand the active tab group.

## TODOs

- [x] Write the README
- [x] Fix some bugs that impact the basic functionality
- [x] Support tab group expand mode similar to vscode
- [ ] Support ratio mode, for example, 3:1, 1:2:1, 1:1:1:1 etc.
- [ ] Support ratio mode from UI. For example, user can drag the border/input ratio to change the ratio of the tab group.
- [ ] Support custom arrangement mode, by the workspace layout state provided by user. For example, the plugin can read the root split state from workspace layout, and then apply the arrangement to the tab group without replacing the open editors.
