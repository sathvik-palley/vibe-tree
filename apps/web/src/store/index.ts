import { create } from 'zustand';
import { Worktree } from '@vibetree/core';

interface AppState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Project state
  projectPath: string;
  worktrees: Worktree[];
  selectedWorktree: string | null;
  
  // Terminal state
  terminalSessions: Map<string, string>; // worktreePath -> sessionId
  
  // Theme state
  theme: 'light' | 'dark';
  
  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  setProjectPath: (path: string) => void;
  setWorktrees: (worktrees: Worktree[]) => void;
  setSelectedWorktree: (path: string | null) => void;
  addTerminalSession: (worktreePath: string, sessionId: string) => void;
  removeTerminalSession: (worktreePath: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  connected: false,
  connecting: false,
  error: null,
  projectPath: import.meta.env.VITE_PROJECT_PATH || '', // Can be set via env
  worktrees: [],
  selectedWorktree: null,
  terminalSessions: new Map(),
  theme: 'light',
  
  // Actions
  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  setError: (error) => set({ error }),
  setProjectPath: (projectPath) => set({ projectPath }),
  setWorktrees: (worktrees) => set({ worktrees }),
  setSelectedWorktree: (selectedWorktree) => set({ selectedWorktree }),
  addTerminalSession: (worktreePath, sessionId) => 
    set((state) => {
      const sessions = new Map(state.terminalSessions);
      sessions.set(worktreePath, sessionId);
      return { terminalSessions: sessions };
    }),
  removeTerminalSession: (worktreePath) =>
    set((state) => {
      const sessions = new Map(state.terminalSessions);
      sessions.delete(worktreePath);
      return { terminalSessions: sessions };
    }),
  setTheme: (theme) => set({ theme }),
}));