import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal, HtmlPortalNode } from 'react-reverse-portal';
import { ClaudeTerminal } from './ClaudeTerminal';

interface TerminalManagerProps {
  worktreePath: string;
  projectId?: string;
  theme?: 'light' | 'dark';
}

interface TerminalInstance {
  id: string;
  worktreePath: string;
  portalNode: HtmlPortalNode;
  processId?: string;
}

interface WorktreeTerminals {
  worktreePath: string;
  terminals: TerminalInstance[];
}

// Global cache for terminal portals - persists across component re-renders
const worktreeTerminalsCache = new Map<string, WorktreeTerminals>();

export function TerminalManager({ worktreePath, projectId, theme }: TerminalManagerProps) {
  const [worktreeTerminals, setWorktreeTerminals] = useState<Map<string, WorktreeTerminals>>(worktreeTerminalsCache);
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalProcessIds = useRef<Map<string, string>>(new Map());

  // Create or get terminals for current worktree
  useEffect(() => {
    if (!worktreeTerminalsCache.has(worktreePath)) {
      console.log('Creating initial terminal for:', worktreePath);
      
      // Create a new terminal instance for this worktree
      const terminalId = `${worktreePath}-${Date.now()}`;
      const portalNode = createHtmlPortalNode();
      const terminal: TerminalInstance = {
        id: terminalId,
        worktreePath,
        portalNode
      };
      
      const worktreeData: WorktreeTerminals = {
        worktreePath,
        terminals: [terminal]
      };
      
      // Add to global cache
      worktreeTerminalsCache.set(worktreePath, worktreeData);
      
      // Update state to trigger re-render
      setWorktreeTerminals(new Map(worktreeTerminalsCache));
    }
  }, [worktreePath]);

  // Handle terminal split
  const handleSplit = useCallback((existingTerminalId: string) => {
    const worktreeData = worktreeTerminalsCache.get(worktreePath);
    if (!worktreeData) return;

    console.log('Splitting terminal:', existingTerminalId);
    
    // Create a new terminal instance
    const newTerminalId = `${worktreePath}-${Date.now()}`;
    const portalNode = createHtmlPortalNode();
    const newTerminal: TerminalInstance = {
      id: newTerminalId,
      worktreePath,
      portalNode
    };
    
    // Add the new terminal to the list
    worktreeData.terminals.push(newTerminal);
    
    // Update state to trigger re-render
    setWorktreeTerminals(new Map(worktreeTerminalsCache));
    
    // Force a resize event after a short delay to ensure DOM is updated
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }, [worktreePath]);

  // Handle terminal close
  const handleClose = useCallback(async (terminalId: string) => {
    const worktreeData = worktreeTerminalsCache.get(worktreePath);
    if (!worktreeData) return;

    // Don't allow closing if it's the last terminal
    if (worktreeData.terminals.length <= 1) {
      console.log('Cannot close the last terminal');
      return;
    }

    console.log('Closing terminal:', terminalId);
    
    // Get the process ID for this terminal if it exists
    const processId = terminalProcessIds.current.get(terminalId);
    if (processId) {
      console.log('Terminating PTY for terminal:', terminalId, 'processId:', processId);
      try {
        await window.electronAPI.shell.terminate(processId);
      } catch (error) {
        console.error('Error terminating PTY:', error);
      }
      terminalProcessIds.current.delete(terminalId);
    }
    
    // Remove the terminal from the list
    worktreeData.terminals = worktreeData.terminals.filter(t => t.id !== terminalId);
    
    // Update state to trigger re-render
    setWorktreeTerminals(new Map(worktreeTerminalsCache));
  }, [worktreePath]);

  // Callback to track process IDs from terminals
  const handleTerminalProcessId = useCallback((terminalId: string, processId: string) => {
    if (processId) {
      terminalProcessIds.current.set(terminalId, processId);
    }
  }, []);

  // Get current worktree's terminals
  const currentTerminals = useMemo(() => {
    const worktreeData = worktreeTerminals.get(worktreePath);
    return worktreeData?.terminals || [];
  }, [worktreeTerminals, worktreePath]);

  // Get all terminals from all worktrees for rendering InPortals
  const allTerminals = useMemo(() => {
    const terminals: TerminalInstance[] = [];
    worktreeTerminals.forEach(worktreeData => {
      terminals.push(...worktreeData.terminals);
    });
    return terminals;
  }, [worktreeTerminals]);

  // Watch for DOM changes and trigger resize when terminals are added/removed
  useEffect(() => {
    if (!containerRef.current) return;

    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      // Check if any terminals were added or removed
      const hasStructuralChange = mutations.some(mutation => 
        mutation.type === 'childList' && 
        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
      );

      if (hasStructuralChange) {
        // Trigger a resize event to ensure all terminals fit properly
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    });

    // Start observing the container for child changes
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="terminal-manager-root flex-1 h-full relative">
      {/* Render all terminals into their portals (this happens once per terminal) */}
      {allTerminals.map((terminal) => (
        <InPortal key={terminal.id} node={terminal.portalNode}>
          <ClaudeTerminal
            worktreePath={terminal.worktreePath}
            projectId={projectId}
            theme={theme}
            terminalId={terminal.id}
            isVisible={currentTerminals.some(t => t.id === terminal.id)}
            onSplit={() => handleSplit(terminal.id)}
            onClose={() => handleClose(terminal.id)}
            canClose={currentTerminals.length > 1}
            onProcessIdChange={(processId) => handleTerminalProcessId(terminal.id, processId)}
          />
        </InPortal>
      ))}
      
      {/* Show the current worktree's terminals in a split layout */}
      <div className="flex h-full">
        {currentTerminals.map((terminal, index) => (
          <div
            key={`out-${terminal.id}`}
            className="terminal-outportal-wrapper h-full relative flex flex-col"
            style={{
              width: `${100 / currentTerminals.length}%`,
              borderRight: index < currentTerminals.length - 1 ? '1px solid var(--border)' : 'none'
            }}
          >
            <OutPortal node={terminal.portalNode} />
          </div>
        ))}
      </div>
    </div>
  );
}