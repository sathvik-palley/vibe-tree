import { useAppStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChevronLeft, GitBranch, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function WorktreePanel() {
  const { 
    worktrees, 
    selectedWorktree, 
    setSelectedWorktree,
    projectPath,
    setWorktrees,
    connected
  } = useAppStore();
  const { getAdapter } = useWebSocket();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    const adapter = getAdapter();
    if (!adapter || !connected) return;

    setLoading(true);
    try {
      const trees = await adapter.listWorktrees(projectPath);
      setWorktrees(trees);
    } catch (error) {
      console.error('Failed to refresh worktrees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorktree = (path: string) => {
    setSelectedWorktree(path);
  };

  const handleBack = () => {
    setSelectedWorktree(null);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Panel Header */}
      <div className="h-14 px-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Back button on mobile when terminal is selected */}
          {selectedWorktree && (
            <button
              onClick={handleBack}
              className="md:hidden p-1 hover:bg-accent rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <h2 className="font-semibold">Worktrees</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={!connected || loading}
          className="p-1 hover:bg-accent rounded disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Project Path */}
      <div className="px-4 py-2 border-b bg-muted/50">
        <p className="text-xs text-muted-foreground truncate">{projectPath}</p>
      </div>

      {/* Worktree List */}
      <div className="flex-1 overflow-y-auto">
        {!connected ? (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">Not connected to server</p>
          </div>
        ) : worktrees.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">No worktrees found</p>
            <p className="text-xs mt-2">Create worktrees in the desktop app</p>
          </div>
        ) : (
          <div className="p-2">
            {worktrees.map((worktree) => (
              <button
                key={worktree.path}
                onClick={() => handleSelectWorktree(worktree.path)}
                className={`
                  w-full text-left p-3 rounded-md mb-1 transition-colors
                  ${selectedWorktree === worktree.path 
                    ? 'bg-accent' 
                    : 'hover:bg-accent/50'
                  }
                `}
              >
                <div className="flex items-start gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {worktree.branch.replace('refs/heads/', '')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {worktree.path.split('/').slice(-2).join('/')}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}