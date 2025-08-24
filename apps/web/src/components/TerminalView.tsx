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
    if (!selectedWorktree) {
      return;
    }

    const adapter = getAdapter();
    if (!adapter) {
      return;
    }

    // Check if we already have a session for this worktree
    const existingSessionId = terminalSessions.get(selectedWorktree);
    if (existingSessionId) {
      // Set up event listeners for existing session
      const unsubscribeOutput = adapter.onShellOutput(existingSessionId, (data) => {
        if (terminalRef.current) {
          terminalRef.current.write(data);
        }
      });

      const unsubscribeExit = adapter.onShellExit(existingSessionId, (code) => {
        if (terminalRef.current) {
          terminalRef.current.write(`\r\n[Process exited with code ${code}]\r\n`);
        }
        removeTerminalSession(selectedWorktree);
        setSessionId(null);
      });

      cleanupRef.current = [unsubscribeOutput, unsubscribeExit];
      setSessionId(existingSessionId);
      return;
    }

    // Start new shell session
    const startSession = async () => {
      try {
        // First, get or create a deterministic session ID for this worktree
        // This matches the server's generateSessionId logic
        const encoder = new TextEncoder();
        const data = encoder.encode(selectedWorktree);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const expectedSessionId = hashHex.substring(0, 16);
        
        // Set up event listeners FIRST, before starting shell
        // This prevents race condition where shell output arrives before listeners are registered
        const unsubscribeOutput = adapter.onShellOutput(expectedSessionId, (data) => {
          if (terminalRef.current) {
            terminalRef.current.write(data);
          }
        });

        const unsubscribeExit = adapter.onShellExit(expectedSessionId, (code) => {
          if (terminalRef.current) {
            terminalRef.current.write(`\r\n[Process exited with code ${code}]\r\n`);
          }
          removeTerminalSession(selectedWorktree);
          setSessionId(null);
        });

        // Store cleanup functions immediately
        cleanupRef.current = [unsubscribeOutput, unsubscribeExit];
        
        // Set session ID immediately so terminal component can render
        setSessionId(expectedSessionId);
        
        // NOW start the shell session - listeners are already in place
        const result = await adapter.startShell(selectedWorktree);
        
        if (result.success && result.processId) {
          addTerminalSession(selectedWorktree, result.processId);
        } else {
          // Clean up listeners if session failed
          cleanupRef.current.forEach(cleanup => cleanup());
          cleanupRef.current = [];
          setSessionId(null);
        }
      } catch (error) {
        console.error('Failed to start shell session:', error);
        // Clean up listeners on error
        cleanupRef.current.forEach(cleanup => cleanup());
        cleanupRef.current = [];
        setSessionId(null);
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
    if (!sessionId) {
      return;
    }
    
    const adapter = getAdapter();
    if (!adapter) {
      return;
    }

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