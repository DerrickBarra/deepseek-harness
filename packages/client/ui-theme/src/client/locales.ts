/** `settings.theme` namespace dictionaries (the Appearance row's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'appearance.title': '外观',
  'appearance.light': '浅色',
  'appearance.dark': '深色',
  'appearance.system': '跟随系统',
  'appearance.palette': '配色方案',
  'appearance.palette.default': '默认',
  'appearance.palette.custom': '自定义',
  'custom.title': '自定义颜色',
  'custom.light': '浅色',
  'custom.dark': '深色',
  'custom.accent': '强调色',
  'custom.background': '应用背景',
  'custom.surface': '浮层表面',
  'custom.sidebar': '侧边栏',
  'custom.primaryText': '主要文字',
  'custom.secondaryText': '次要文字',
  'custom.save': '保存',
  'custom.reset': '重置',
  'custom.cancel': '取消',
} satisfies Record<string, string>

/** The settings.theme namespace key union. */
export type ThemeKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'appearance.title': 'Appearance',
  'appearance.light': 'Light',
  'appearance.dark': 'Dark',
  'appearance.system': 'System',
  'appearance.palette': 'Color scheme',
  'appearance.palette.default': 'Default',
  'appearance.palette.custom': 'Custom',
  'custom.title': 'Custom colors',
  'custom.light': 'Light',
  'custom.dark': 'Dark',
  'custom.accent': 'Accent',
  'custom.background': 'Application background',
  'custom.surface': 'Raised surface',
  'custom.sidebar': 'Sidebar',
  'custom.primaryText': 'Primary text',
  'custom.secondaryText': 'Secondary text',
  'custom.save': 'Save',
  'custom.reset': 'Reset',
  'custom.cancel': 'Cancel',
} satisfies Record<ThemeKey, string>
