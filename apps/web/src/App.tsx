import { useEffect } from 'react';
import { WorktreePanel } from './components/WorktreePanel';
import { TerminalView } from './components/TerminalView';
import { ConnectionStatus } from './components/ConnectionStatus';
import { useAppStore } from './store';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { selectedWorktree } = useAppStore();
  const { connect } = useWebSocket();

  useEffect(() => {
    // Auto-connect on mount
    connect();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">VibeTree</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">Web Terminal</span>
        </div>
        <ConnectionStatus />
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