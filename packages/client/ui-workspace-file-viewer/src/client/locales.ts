/** Workspace file viewer UI dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'workspaceFileViewer'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'action.label': '文件',
  'action.aria': '打开工作区文件浏览器',
  'panel.title': '工作区文件',
  'panel.close': '关闭文件浏览器',
  'panel.refresh': '刷新',
  'root.label': '根目录',
  'loading': '正在加载...',
  'empty': '此文件夹为空',
  'error.title': '无法加载',
  'unsupported': '不支持预览此文件类型',
  'file.size': '{size} bytes',
  'breadcrumb.root': '根目录',
} satisfies Record<string, string>

/** Workspace file viewer locale key union. */
export type WorkspaceFileViewerKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'action.label': 'Files',
  'action.aria': 'Open workspace file browser',
  'panel.title': 'Workspace files',
  'panel.close': 'Close file browser',
  'panel.refresh': 'Refresh',
  'root.label': 'Root',
  'loading': 'Loading...',
  'empty': 'This folder is empty',
  'error.title': 'Could not load',
  'unsupported': 'This file type cannot be previewed',
  'file.size': '{size} bytes',
  'breadcrumb.root': 'Root',
} satisfies Record<WorkspaceFileViewerKey, string>
