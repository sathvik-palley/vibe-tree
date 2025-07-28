import { useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { GitBranch, Plus, RefreshCw, Code2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
  const [detectedIDEs, setDetectedIDEs] = useState<Array<{ name: string; command: string }>>([]);
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

  useEffect(() => {
    // Detect available IDEs
    window.electronAPI.ide.detect().then(setDetectedIDEs);
  }, []);

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

  const handleOpenInIDE = async (ideName: string, worktreePath?: string) => {
    const pathToOpen = worktreePath || selectedWorktree;
    if (!pathToOpen) return;

    try {
      const result = await window.electronAPI.ide.open(ideName, pathToOpen);
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to open IDE",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open IDE",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-80 border-r flex flex-col h-full">
      <div className="p-4 border-b space-y-2 flex-shrink-0">
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
            {detectedIDEs.length > 0 && selectedWorktree && (
              detectedIDEs.length === 1 ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleOpenInIDE(detectedIDEs[0].name)}
                  title={`Open in ${detectedIDEs[0].name}`}
                >
                  <Code2 className="h-4 w-4" />
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Code2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {detectedIDEs.map((ide) => (
                      <DropdownMenuItem
                        key={ide.name}
                        onClick={() => handleOpenInIDE(ide.name)}
                      >
                        Open in {ide.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{projectPath}</p>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="p-2">
          {worktrees.map((worktree) => (
            <div
              key={worktree.path}
              className={`group relative w-full text-left p-3 rounded-md transition-colors ${
                selectedWorktree === worktree.path
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              }`}
            >
              <button
                onClick={() => onSelectWorktree(worktree.path)}
                className="w-full flex items-center gap-2"
              >
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{worktree.branch}</div>
                  <div className="text-xs text-muted-foreground truncate">{worktree.path}</div>
                </div>
              </button>
              {detectedIDEs.length > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {detectedIDEs.length === 1 ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInIDE(detectedIDEs[0].name, worktree.path);
                      }}
                      title={`Open in ${detectedIDEs[0].name}`}
                    >
                      <Code2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Code2 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {detectedIDEs.map((ide) => (
                          <DropdownMenuItem
                            key={ide.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInIDE(ide.name, worktree.path);
                            }}
                          >
                            Open in {ide.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>
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