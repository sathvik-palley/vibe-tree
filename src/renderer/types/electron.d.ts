export interface ElectronAPI {
  git: {
    listWorktrees: (projectPath: string) => Promise<Array<{
      path: string;
      branch: string;
      head: string;
    }>>;
    addWorktree: (projectPath: string, branchName: string) => Promise<{
      path: string;
      branch: string;
    }>;
  };
  shell: {
    start: (worktreePath: string, cols?: number, rows?: number) => Promise<{ success: boolean; processId?: string; isNew?: boolean; error?: string }>;
    write: (processId: string, data: string) => Promise<{ success: boolean; error?: string }>;
    resize: (processId: string, cols: number, rows: number) => Promise<{ success: boolean; error?: string }>;
    status: (processId: string) => Promise<{ running: boolean }>;
    getBuffer: (processId: string) => Promise<{ success: boolean; buffer?: string | null; error?: string }>;
    onOutput: (processId: string, callback: (data: string) => void) => () => void;
    onExit: (processId: string, callback: (code: number) => void) => () => void;
  };
  ide: {
    detect: () => Promise<Array<{ name: string; command: string }>>;
    open: (ideName: string, worktreePath: string) => Promise<{ success: boolean; error?: string }>;
  };
  theme: {
    get: () => Promise<'light' | 'dark'>;
    onChange: (callback: (theme: 'light' | 'dark') => void) => void;
  };
  dialog: {
    selectDirectory: () => Promise<string | undefined>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}