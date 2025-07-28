import { useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { GitBranch, Plus, RefreshCw } from 'lucide-react';
import { useToast } from './ui/use-toast';

interface Worktree {
  path: string;
  branch: string;
  head: string;
}

interface WorktreePanelProps {
  projectPath: string;
  selectedWorktree: string | null;
  onSelectWorktree: (path: string) => void;
  onWorktreesChange?: (worktrees: Worktree[]) => void;
}

export function WorktreePanel({ projectPath, selectedWorktree, onSelectWorktree, onWorktreesChange }: WorktreePanelProps) {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewBranchDialog, setShowNewBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const { toast } = useToast();

  const loadWorktrees = useCallback(async () => {
    setLoading(true);
    try {
      const trees = await window.electronAPI.git.listWorktrees(projectPath);
      setWorktrees(trees);
      onWorktreesChange?.(trees);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load worktrees. Make sure this is a git repository.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [projectPath, toast]);

  useEffect(() => {
    loadWorktrees();
  }, [projectPath]);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      const result = await window.electronAPI.git.addWorktree(projectPath, newBranchName);
      toast({
        title: "Success",
        description: `Created worktree for branch ${result.branch}`,
      });
      setShowNewBranchDialog(false);
      setNewBranchName('');
      loadWorktrees();
      onSelectWorktree(result.path);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create worktree",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-80 border-r flex flex-col h-full">
      <div className="h-[57px] px-4 border-b flex-shrink-0 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Worktrees</h3>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={loadWorktrees}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewBranchDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">{projectPath}</p>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="p-2">
          {worktrees.map((worktree) => (
            <button
              key={worktree.path}
              onClick={() => onSelectWorktree(worktree.path)}
              className={`w-full text-left p-3 rounded-md transition-colors flex items-center gap-1.5 ${
                selectedWorktree === worktree.path
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              }`}
            >
              <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{worktree.branch}</div>
                <div className="text-xs text-muted-foreground truncate">{worktree.path}</div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={showNewBranchDialog} onOpenChange={setShowNewBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Feature Branch</DialogTitle>
            <DialogDescription>
              This will create a new git worktree for parallel development with Claude
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="feature-name"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateBranch();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBranchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
              Create Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}