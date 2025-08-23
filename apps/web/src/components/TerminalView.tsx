import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@vibetree/ui';
import { useAppStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import type { Terminal as XTerm } from '@xterm/xterm';

export function TerminalView() {
  const { 
    getActiveProject,
    setSelectedWorktree,
    terminalSessions,
    addTerminalSession,
    removeTerminalSession
  } = useAppStore();
  
  const activeProject = getActiveProject();
  const selectedWorktree = activeProject?.selectedWorktree;
  const { getAdapter } = useWebSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<XTerm | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!selectedWorktree) return;

    const adapter = getAdapter();
    if (!adapter) return;

    // Check if we already have a session for this worktree
    const existingSessionId = terminalSessions.get(selectedWorktree);
    if (existingSessionId) {
      setSessionId(existingSessionId);
      return;
    }

    // Start new shell session
    const startSession = async () => {
      try {
        const result = await adapter.startShell(selectedWorktree);
        if (result.success && result.processId) {
          setSessionId(result.processId);
          addTerminalSession(selectedWorktree, result.processId);

          // Set up output listener
          const unsubscribeOutput = adapter.onShellOutput(result.processId, (data) => {
            if (terminalRef.current) {
              terminalRef.current.write(data);
            }
          });

          // Set up exit listener
          const unsubscribeExit = adapter.onShellExit(result.processId, (code) => {
            if (terminalRef.current) {
              terminalRef.current.write(`\r\n[Process exited with code ${code}]\r\n`);
            }
            removeTerminalSession(selectedWorktree);
            setSessionId(null);
          });

          cleanupRef.current = [unsubscribeOutput, unsubscribeExit];
        }
      } catch (error) {
        console.error('Failed to start shell session:', error);
      }
    };

    startSession();

    return () => {
      // Cleanup listeners
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, [selectedWorktree, getAdapter, terminalSessions, addTerminalSession, removeTerminalSession]);

  const handleTerminalData = async (data: string) => {
    if (!sessionId) return;
    
    const adapter = getAdapter();
    if (!adapter) return;

    try {
      await adapter.writeToShell(sessionId, data);
    } catch (error) {
      console.error('Failed to write to shell:', error);
    }
  };

  const handleTerminalResize = async (cols: number, rows: number) => {
    if (!sessionId) return;
    
    const adapter = getAdapter();
    if (!adapter) return;

    try {
      await adapter.resizeShell(sessionId, cols, rows);
    } catch (error) {
      console.error('Failed to resize shell:', error);
    }
  };

  const handleTerminalReady = (terminal: XTerm) => {
    terminalRef.current = terminal;
  };

  const handleBack = () => {
    if (activeProject) {
      setSelectedWorktree(activeProject.id, null);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!selectedWorktree) return null;

  return (
    <div className={`flex flex-col w-full h-full ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Terminal Header */}
      <div className="h-14 px-4 border-b flex items-center justify-between flex-shrink-0 bg-background">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleBack}
            className="md:hidden p-1 hover:bg-accent rounded flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">Terminal</h3>
            <p className="text-xs text-muted-foreground truncate">
              {selectedWorktree.split('/').slice(-2).join('/')}
            </p>
          </div>
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-1 hover:bg-accent rounded"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 bg-black">
        {sessionId && (
          <Terminal
            id={sessionId}
            onData={handleTerminalData}
            onResize={handleTerminalResize}
            onReady={handleTerminalReady}
            config={{
              theme: 'dark',
              fontSize: 14,
              cursorBlink: true
            }}
          />
        )}
        {!sessionId && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Starting terminal session...</p>
          </div>
        )}
      </div>
    </div>
  );
}