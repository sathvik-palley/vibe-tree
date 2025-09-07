import { create } from 'zustand';
import { Worktree } from '@vibetree/core';


// Helper function to set up Claude hooks for a project and all its worktrees
async function setupClaudeHooksForProject(projectPath: string) {
  try {
    console.log(`🔧 Setting up Claude hooks for project: ${projectPath}`);
    
    // Get all worktrees for the project
    const worktreePaths = await getProjectWorktrees(projectPath);
    
    // Set up hooks for main project and all worktrees
    const response = await fetch('http://localhost:3002/api/claude/hooks/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectPaths: [projectPath, ...worktreePaths],
        includeGlobal: false
      }),
    });

    if (response.ok) {
      console.log(`✅ Claude hooks configured for ${projectPath} and ${worktreePaths.length} worktrees`);
    }
  } catch (error) {
    // Silently continue if hook setup fails
  }
}

// Helper function to get all worktree paths for a project
async function getProjectWorktrees(projectPath: string): Promise<string[]> {
  try {
    const response = await fetch(`http://localhost:3002/api/git/worktrees?projectPath=${encodeURIComponent(projectPath)}`);
    if (response.ok) {
      const worktrees = await response.json() as Array<{ path: string; branch: string }>;
      return worktrees
        .filter(w => w.path !== projectPath) // Exclude main project
        .map(w => w.path);
    }
  } catch (error) {
    console.log(`Could not list worktrees for ${projectPath}, setting up main directory only`);
  }
  return [];
}

// Helper function to set up Claude hooks for multiple projects
async function setupClaudeHooksForMultipleProjects(projectPaths: string[]) {
  try {
    const response = await fetch('http://localhost:3002/api/claude/hooks/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectPaths,
        includeGlobal: false
      }),
    });

    if (response.ok) {
      console.log(`✅ Claude hooks configured for ${projectPaths.length} projects`);
    }
  } catch (error) {
    // Silently continue if hook setup fails
  }
}

interface Project {
  id: string;
  path: string;
  name: string;
  worktrees: Worktree[];
  selectedWorktree: string | null;
  selectedTab: 'terminal' | 'changes';
}

interface AppState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Project state
  projects: Project[];
  activeProjectId: string | null;
  
  // Terminal state
  terminalSessions: Map<string, string>; // worktreePath -> sessionId
  
  // Theme state
  theme: 'light' | 'dark';
  
  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  addProject: (path: string) => string;
  addProjects: (paths: string[]) => string[];
  removeProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  updateProjectWorktrees: (id: string, worktrees: Worktree[]) => void;
  setSelectedWorktree: (projectId: string, worktreePath: string | null) => void;
  setSelectedTab: (projectId: string, tab: 'terminal' | 'changes') => void;
  getProject: (id: string) => Project | undefined;
  getActiveProject: () => Project | undefined;
  addTerminalSession: (worktreePath: string, sessionId: string) => void;
  removeTerminalSession: (worktreePath: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  connected: false,
  connecting: false,
  error: null,
  projects: [],
  activeProjectId: null,
  terminalSessions: new Map(),
  theme: 'light',
  
  // Actions
  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  setError: (error) => set({ error }),
  
  addProject: (path: string) => {
    const state = get();
    // Check if project already exists
    const existing = state.projects.find(p => p.path === path);
    if (existing) {
      set({ activeProjectId: existing.id });
      return existing.id;
    }

    const id = `project-${Date.now()}`;
    const name = path.split('/').pop() || 'Unnamed Project';
    
    const newProject: Project = {
      id,
      path,
      name,
      worktrees: [],
      selectedWorktree: null,
      selectedTab: 'terminal'
    };

    set((state) => ({
      projects: [...state.projects, newProject],
      activeProjectId: id
    }));

    // Auto-configure Claude hooks for this project
    setupClaudeHooksForProject(path);
    
    return id;
  },

  addProjects: (paths: string[]) => {
    const state = get();
    const newProjects: Project[] = [];
    const addedIds: string[] = [];

    paths.forEach(path => {
      // Check if project already exists
      const existing = state.projects.find(p => p.path === path);
      if (existing) {
        addedIds.push(existing.id);
        return;
      }

      const id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const name = path.split('/').pop() || 'Unnamed Project';
      
      const newProject: Project = {
        id,
        path,
        name,
        worktrees: [],
        selectedWorktree: null,
        selectedTab: 'terminal'
      };

      newProjects.push(newProject);
      addedIds.push(id);
    });

    if (newProjects.length > 0) {
      set((state) => ({
        projects: [...state.projects, ...newProjects]
      }));

      // Auto-configure Claude hooks for all new projects
      setupClaudeHooksForMultipleProjects(newProjects.map(p => p.path));
    }

    return addedIds;
  },

  removeProject: (id: string) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
    }));
  },

  setActiveProject: (id: string) => {
    set({ activeProjectId: id });
  },

  updateProjectWorktrees: (id: string, worktrees: Worktree[]) => {
    set((state) => ({
      projects: state.projects.map(project =>
        project.id === id ? { ...project, worktrees } : project
      )
    }));
  },

  setSelectedWorktree: (projectId: string, worktreePath: string | null) => {
    set((state) => ({
      projects: state.projects.map(project =>
        project.id === projectId 
          ? { ...project, selectedWorktree: worktreePath }
          : project
      )
    }));
  },

  setSelectedTab: (projectId: string, tab: 'terminal' | 'changes') => {
    set((state) => ({
      projects: state.projects.map(project =>
        project.id === projectId 
          ? { ...project, selectedTab: tab }
          : project
      )
    }));
  },

  getProject: (id: string) => {
    return get().projects.find(p => p.id === id);
  },

  getActiveProject: () => {
    const state = get();
    return state.activeProjectId ? state.projects.find(p => p.id === state.activeProjectId) : undefined;
  },

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