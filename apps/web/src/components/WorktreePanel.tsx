import { useAppStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChevronLeft, GitBranch, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WorktreePanelProps {
  projectId: string;
}

export function WorktreePanel({ projectId }: WorktreePanelProps) {
  const { 
    getProject,
    updateProjectWorktrees,
    setSelectedWorktree,
    connected
  } = useAppStore();
  
  const { getAdapter } = useWebSocket();
  const [loading, setLoading] = useState(false);
  
  const project = getProject(projectId);
  const adapter = getAdapter(); // Get adapter once per render

  const handleRefresh = async () => {
    const adapter = getAdapter();
    if (!adapter || !connected || !project || loading) return;

    setLoading(true);
    try {
      const trees = await adapter.listWorktrees(project.path);
      updateProjectWorktrees(projectId, trees);
    } catch (error) {
      console.error('Failed to refresh worktrees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorktree = (path: string) => {
    setSelectedWorktree(projectId, path);
  };

  const handleBack = () => {
    setSelectedWorktree(projectId, null);
  };

  // Auto-load worktrees when component mounts or project changes
  useEffect(() => {
    console.log('🔄 WorktreePanel useEffect triggered:', { 
      projectId, 
      connected, 
      loading,
      hasProject: !!project,
      hasAdapter: !!adapter,
      projectPath: project?.path,
      currentWorktrees: project?.worktrees?.length || 0
    });
    
    if (!project || !connected || loading || !adapter) {
      console.log('❌ Early return from useEffect:', { 
        hasProject: !!project, 
        connected, 
        loading,
        hasAdapter: !!adapter
      });
      return;
    }
    
    // Inline refresh logic with stable dependencies
    const loadWorktrees = async () => {
      console.log('🚀 Starting worktree load for:', project.path);
      setLoading(true);
      
      try {
        const trees = await adapter.listWorktrees(project.path);
        console.log('✅ Worktrees loaded:', trees);
        updateProjectWorktrees(projectId, trees);
        console.log('✅ Project worktrees updated');
      } catch (error) {
        console.error('❌ Failed to load worktrees:', error);
      } finally {
        setLoading(false);
        console.log('🏁 Loading finished');
      }
    };
    
    loadWorktrees();
  }, [projectId, connected, adapter?.constructor?.name]); // Stable dependency on adapter presence
  
  if (!project) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Project not found</div>;
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Panel Header */}
      <div className="h-14 px-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Back button on mobile when terminal is selected */}
          {project.selectedWorktree && (
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
        <p className="text-xs text-muted-foreground truncate">{project.path}</p>
      </div>

      {/* Worktree List */}
      <div className="flex-1 overflow-y-auto">
        {!connected ? (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">Not connected to server</p>
          </div>
        ) : project.worktrees.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">No worktrees found</p>
            <p className="text-xs mt-2">Create worktrees in the desktop app</p>
          </div>
        ) : (
          <div className="p-2">
            {project.worktrees.map((worktree) => (
              <button
                key={worktree.path}
                onClick={() => handleSelectWorktree(worktree.path)}
                className={`
                  w-full text-left p-3 rounded-md mb-1 transition-colors
                  ${project.selectedWorktree === worktree.path 
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