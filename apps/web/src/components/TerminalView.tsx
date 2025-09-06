import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@vibetree/ui';
import { useAppStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import type { Terminal as XTerm } from '@xterm/xterm';

// Cache for terminal states per session ID (like desktop app)
const terminalStateCache = new Map<string, string>();

interface TerminalViewProps {
  worktreePath: string;
}

export function TerminalView({ worktreePath }: TerminalViewProps) {
  const { 
    getActiveProject,
    setSelectedWorktree,
    terminalSessions,
    addTerminalSession,
    removeTerminalSession,
    theme
  } = useAppStore();
  
  const activeProject = getActiveProject();
  const selectedWorktree = worktreePath;
  const { getAdapter } = useWebSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<XTerm | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  const saveIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // Clear cached state when session exits
        terminalStateCache.delete(existingSessionId);
        removeTerminalSession(selectedWorktree);
        setSessionId(null);
      });

      cleanupRef.current = [unsubscribeOutput, unsubscribeExit];
      setSessionId(existingSessionId);
      
      // Restore terminal state for existing session (like desktop app)
      console.log('🔄 Reconnecting to existing session - restoring state');
      console.log('📊 Session cache status:', {
        sessionId: existingSessionId,
        hasCachedState: terminalStateCache.has(existingSessionId),
        cacheSize: terminalStateCache.size,
        allCachedSessions: Array.from(terminalStateCache.keys())
      });
      
      const cachedState = terminalStateCache.get(existingSessionId);
      if (cachedState && terminalRef.current) {
        setTimeout(() => {
          if (terminalRef.current && cachedState) {
            terminalRef.current.clear();
            terminalRef.current.write(cachedState);
            console.log('✅ State restored for existing session:', existingSessionId);
          }
        }, 100);
      } else {
        console.log('⚠️ No cached state for existing session:', existingSessionId);
      }
      
      return;
    }

    // Start new shell session - follow desktop app pattern
    const startSession = async () => {
      try {
        // Call server directly and wait for actual session ID (like desktop app)
        const result = await adapter.startShell(selectedWorktree);
        
        if (result.success && result.processId) {
          // Use the actual session ID returned by server
          const actualSessionId = result.processId;
          
          // Set up event listeners using the server-provided session ID
          const unsubscribeOutput = adapter.onShellOutput(actualSessionId, (data) => {
            if (terminalRef.current) {
              terminalRef.current.write(data);
            }
          });

          const unsubscribeExit = adapter.onShellExit(actualSessionId, (code) => {
            if (terminalRef.current) {
              terminalRef.current.write(`\r\n[Process exited with code ${code}]\r\n`);
            }
            // Clear cached state when session exits
            terminalStateCache.delete(actualSessionId);
            removeTerminalSession(selectedWorktree);
            setSessionId(null);
          });

          cleanupRef.current = [unsubscribeOutput, unsubscribeExit];
          // Check if this is a different session ID than what we had cached
          const cachedSessionId = terminalSessions.get(selectedWorktree);
          if (cachedSessionId && cachedSessionId !== actualSessionId) {
            console.warn(`🔄 Session ID changed for ${selectedWorktree}:`, {
              oldSessionId: cachedSessionId,
              newSessionId: actualSessionId,
              reason: 'Likely session timeout and cleanup'
            });
            // Clear old cached state since session changed
            terminalStateCache.delete(cachedSessionId);
          }
          
          setSessionId(actualSessionId);
          addTerminalSession(selectedWorktree, actualSessionId);
          
          console.log(`Shell started: ${actualSessionId}, isNew: ${result.isNew}, worktree: ${selectedWorktree}`);
          console.log('📊 Terminal cache status:', {
            sessionId: actualSessionId,
            hasCachedState: terminalStateCache.has(actualSessionId),
            cacheSize: terminalStateCache.size,
            allCachedSessions: Array.from(terminalStateCache.keys())
          });
          
          // Handle terminal state restoration like desktop app
          if (!result.isNew) {
            // Existing shell - restore cached state to fresh terminal
            console.log('🔄 Existing shell session - restoring state');
            const cachedState = terminalStateCache.get(actualSessionId);
            if (cachedState && terminalRef.current) {
              // Clear the fresh terminal first
              terminalRef.current.clear();
              // Restore the cached content after a delay to ensure terminal is ready
              setTimeout(() => {
                if (terminalRef.current && cachedState) {
                  terminalRef.current.write(cachedState);
                  console.log('✅ State restored for session:', actualSessionId);
                }
              }, 100);
            } else {
              console.log('⚠️ No cached state found for session:', actualSessionId);
            }
          } else {
            // New shell - terminal is already clean
            console.log('🧹 New shell session - terminal ready');
          }
        } else {
          console.error('Failed to start shell session:', result.error);
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

  // Periodic state saving and cleanup (like desktop app)
  useEffect(() => {
    if (!sessionId) return;
    
    // Start periodic saving every 5 seconds (like desktop app)
    saveIntervalRef.current = setInterval(() => {
      if (sessionId) {
        try {
          const terminalInstance = (window as any)[`terminal_${sessionId}`];
          if (terminalInstance?.serialize) {
            const serializedState = terminalInstance.serialize();
            if (serializedState) {
              terminalStateCache.set(sessionId, serializedState);
              console.log('💾 Periodic save for session:', sessionId);
            }
          }
        } catch (error) {
          console.error('Failed to save terminal state:', error);
        }
      }
    }, 5000);
    
    return () => {
      // Save state before component unmount (like desktop app)
      if (sessionId) {
        try {
          const terminalInstance = (window as any)[`terminal_${sessionId}`];
          if (terminalInstance?.serialize) {
            const serializedState = terminalInstance.serialize();
            if (serializedState) {
              terminalStateCache.set(sessionId, serializedState);
              console.log('💾 Final save on unmount for session:', sessionId);
            }
          }
        } catch (error) {
          console.error('Failed to save terminal state on unmount:', error);
        }
      }
      
      // Clear interval
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [sessionId]);

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
              {selectedWorktree?.split('/').slice(-2).join('/')}
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
      <div className={`flex-1 ${theme === 'light' ? 'bg-white' : 'bg-black'}`}>
        {sessionId && (
          <Terminal
            id={sessionId}
            onData={handleTerminalData}
            onResize={handleTerminalResize}
            onReady={handleTerminalReady}
            config={{
              theme: theme,
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