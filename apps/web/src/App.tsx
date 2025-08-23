import { useEffect } from 'react';
import { WorktreePanel } from './components/WorktreePanel';
import { TerminalView } from './components/TerminalView';
import { ConnectionStatus } from './components/ConnectionStatus';
import { useAppStore } from './store';
import { useWebSocket } from './hooks/useWebSocket';
import { Sun, Moon } from 'lucide-react';

function App() {
  const { selectedWorktree, theme, setTheme } = useAppStore();
  const { connect } = useWebSocket();

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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile: Show either panel or terminal based on selection */}
        {/* Desktop: Show both side by side */}
        <div className="flex w-full">
          {/* Worktree Panel - Hidden on mobile when terminal is selected */}
          <div className={`
            ${selectedWorktree ? 'hidden md:flex' : 'flex'} 
            w-full md:w-80 border-r flex-shrink-0
          `}>
            <WorktreePanel />
          </div>

          {/* Terminal View - Hidden on mobile when no worktree selected */}
          {selectedWorktree && (
            <div className="flex-1 flex">
              <TerminalView />
            </div>
          )}

          {/* Empty state for desktop when no worktree selected */}
          {!selectedWorktree && (
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">Select a worktree to start</p>
                <p className="text-sm">Choose from the panel on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;