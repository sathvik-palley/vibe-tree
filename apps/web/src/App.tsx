import { useEffect, useState } from 'react';
import { WorktreePanel } from './components/WorktreePanel';
import { TerminalView } from './components/TerminalView';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ProjectSelector } from './components/ProjectSelector';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@vibetree/ui';
import { useAppStore } from './store';
import { useWebSocket } from './hooks/useWebSocket';
import { Sun, Moon, Plus, X } from 'lucide-react';

function App() {
  const { projects, activeProjectId, addProject, removeProject, setActiveProject, getActiveProject, theme, setTheme } = useAppStore();
  const { connect } = useWebSocket();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  const activeProject = getActiveProject();

  useEffect(() => {
    // Auto-connect on mount
    connect();
  }, []);

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    }
  }, [setTheme]);

  useEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleSelectProject = (path: string) => {
    addProject(path);
    setShowProjectSelector(false);
  };

  const handleCloseProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    removeProject(projectId);
  };

  // Show project selector if no projects exist or explicitly requested
  if (projects.length === 0 || showProjectSelector) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">VibeTree</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">Web Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <ConnectionStatus />
          </div>
        </header>

        {/* Project Selector */}
        <ProjectSelector onSelectProject={handleSelectProject} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">VibeTree</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">Web Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <ConnectionStatus />
        </div>
      </header>

      {/* Project Tabs and Content */}
      <Tabs 
        value={activeProjectId || ''} 
        onValueChange={setActiveProject}
        className="flex-1 flex flex-col"
      >
        <div className="border-b flex items-center gap-2 bg-muted/50 h-10">
          <TabsList className="h-full bg-transparent p-0 rounded-none">
            {projects.map((project) => (
              <TabsTrigger
                key={project.id}
                value={project.id}
                className="relative pr-8 h-full data-[state=active]:bg-background data-[state=active]:rounded-t-md data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-b-0"
              >
                {project.name}
                <span
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0.5 hover:bg-muted rounded cursor-pointer inline-flex items-center justify-center"
                  onClick={(e) => handleCloseProject(e, project.id)}
                >
                  <X className="h-3 w-3" />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            onClick={() => setShowProjectSelector(true)}
            className="h-8 w-8 p-0 hover:bg-accent rounded transition-colors inline-flex items-center justify-center"
            aria-label="Add project"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {projects.map((project) => (
          <TabsContent 
            key={project.id} 
            value={project.id}
            className="flex-1 m-0 h-full"
          >
            <div className="flex-1 flex overflow-hidden">
              {/* Mobile: Show either panel or terminal based on selection */}
              {/* Desktop: Show both side by side */}
              <div className="flex w-full">
                {/* Worktree Panel - Hidden on mobile when terminal is selected */}
                <div className={`
                  ${project.selectedWorktree ? 'hidden md:flex' : 'flex'} 
                  w-full md:w-80 border-r flex-shrink-0
                `}>
                  <WorktreePanel projectId={project.id} />
                </div>

                {/* Terminal View - Hidden on mobile when no worktree selected */}
                {project.selectedWorktree && (
                  <div className="flex-1 flex">
                    <TerminalView />
                  </div>
                )}

                {/* Empty state for desktop when no worktree selected */}
                {!project.selectedWorktree && (
                  <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg mb-2">Select a worktree to start</p>
                      <p className="text-sm">Choose from the panel on the left</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default App;