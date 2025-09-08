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
    removeWorktree: (projectPath: string, worktreePath: string, branchName: string) => Promise<{
      success: boolean;
      warning?: string;
    }>;
    status: (worktreePath: string) => Promise<Array<{
      path: string;
      status: string;
      staged: boolean;
      modified: boolean;
    }>>;
    diff: (worktreePath: string, filePath?: string) => Promise<string>;
    diffStaged: (worktreePath: string, filePath?: string) => Promise<string>;
  };
  shell: {
    start: (worktreePath: string, cols?: number, rows?: number) => Promise<{ success: boolean; processId?: string; isNew?: boolean; error?: string }>;
    write: (processId: string, data: string) => Promise<{ success: boolean; error?: string }>;
    resize: (processId: string, cols: number, rows: number) => Promise<{ success: boolean; error?: string }>;
    status: (processId: string) => Promise<{ running: boolean }>;
    getBuffer: (processId: string) => Promise<{ success: boolean; buffer?: string | null; error?: string }>;
    openExternal: (url: string) => Promise<void>;
    onOutput: (processId: string, callback: (data: string) => void) => () => void;
    onExit: (processId: string, callback: (code: number) => void) => () => void;
  };
  ide: {
    detect: () => Promise<Array<{ name: string; command: string }>>;
    open: (ideName: string, worktreePath: string) => Promise<{ success: boolean; error?: string }>;
  };
  theme: {
    get: () => Promise<'light' | 'dark'>;
    onChange: (callback: (theme: 'light' | 'dark') => void) => () => void;
  };
  dialog: {
    selectDirectory: () => Promise<string | undefined>;
  };
  notification: {
    show: (options: { title: string; body: string; type: 'claude-finished' | 'claude-needs-input' }) => Promise<{ success: boolean; error?: string }>;
    onReceived: (callback: (notification: { id: string; type: 'claude-finished' | 'claude-needs-input'; worktree: string; message?: string; timestamp: string }) => void) => () => void;
  };
  claude: {
    setupHooks: (projectPath: string) => Promise<{ success: boolean }>;
    setupGlobalHooks: () => Promise<{ success: boolean }>;
    getHooksStatus: (projectPaths: string[]) => Promise<{ globalConfigured: boolean; projectsConfigured: string[] }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}