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
  'panel.collapse': '收起文件夹栏',
  'panel.expand': '展开文件夹栏',
  'root.label': '根目录',
  'loading': '正在加载...',
  'empty': '此文件夹为空',
  'error.title': '无法加载',
  'unsupported': '不支持预览此文件类型',
  'file.size': '{size} bytes',
  'breadcrumb.root': '根目录',
  'menu.addToChat': '添加到聊天',
  'chat.added': '已添加到聊天输入',
  'chat.noSession': '没有可用的聊天会话',
  'mention.open': '在工作区文件浏览器中打开 {path}',
  'viewer.edit': '编辑文件',
  'viewer.view': '查看文件',
  'viewer.save': '保存',
  'viewer.cancel': '取消',
  'viewer.empty': '选择一个文本文件进行预览',
  'viewer.saving': '正在保存...',
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
  'panel.collapse': 'Collapse folders',
  'panel.expand': 'Expand folders',
  'root.label': 'Root',
  'loading': 'Loading...',
  'empty': 'This folder is empty',
  'error.title': 'Could not load',
  'unsupported': 'This file type cannot be previewed',
  'file.size': '{size} bytes',
  'breadcrumb.root': 'Root',
  'menu.addToChat': 'Add to chat',
  'chat.added': 'Added to chat input',
  'chat.noSession': 'No active chat session is available',
  'mention.open': 'Open {path} in workspace file browser',
  'viewer.edit': 'Edit file',
  'viewer.view': 'View file',
  'viewer.save': 'Save',
  'viewer.cancel': 'Cancel',
  'viewer.empty': 'Select a text file to preview',
  'viewer.saving': 'Saving...',
} satisfies Record<WorkspaceFileViewerKey, string>
