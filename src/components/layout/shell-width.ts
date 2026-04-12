export const SHELL_WIDTH_CLASS = {
  form: 'max-w-[44rem]',
  reading: 'max-w-[68rem]',
  workspace: 'max-w-[76rem]',
} as const;

export type PageShellWidth = keyof typeof SHELL_WIDTH_CLASS;

export const NAVBAR_WIDTH_CLASS = SHELL_WIDTH_CLASS.workspace;

export function getPageShellWidthClass(width: PageShellWidth = 'workspace'): string {
  return SHELL_WIDTH_CLASS[width];
}