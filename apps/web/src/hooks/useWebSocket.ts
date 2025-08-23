import { useRef, useCallback } from 'react';
import { WebSocketAdapter } from '../adapters/WebSocketAdapter';
import { useAppStore } from '../store';

export function useWebSocket() {
  const adapterRef = useRef<WebSocketAdapter | null>(null);
  const { 
    setConnected, 
    setConnecting, 
    setError,
    setWorktrees,
    setProjectPath,
    projectPath 
  } = useAppStore();

  const connect = useCallback(async () => {
    if (adapterRef.current) {
      return; // Already connected
    }

    setConnecting(true);
    setError(null);

    try {
      // Get WebSocket URL from environment or construct from current host
      let wsUrl = import.meta.env.VITE_WS_URL;
      
      if (!wsUrl) {
        // If accessing from network (not localhost), use the same host but port 3002
        const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
          wsUrl = 'ws://localhost:3002';
        } else {
          // Use the same host but different port for network access
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.hostname}:3002`;
        }
      }
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      // Create adapter (without JWT for now - will add auth later)
      const adapter = new WebSocketAdapter(wsUrl);
      adapterRef.current = adapter;

      // Wait for connection
      await adapter.connect();
      
      setConnected(true);
      setConnecting(false);

      // Get project path from server if not set
      let finalProjectPath = projectPath;
      if (!finalProjectPath) {
        try {
          // Use the same host logic for API calls
          const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
          const apiHost = isLocalhost ? 'http://localhost:3002' : `http://${window.location.hostname}:3002`;
          const response = await fetch(`${apiHost}/api/config`);
          const config = await response.json();
          finalProjectPath = config.projectPath;
          setProjectPath(finalProjectPath);
        } catch (err) {
          console.error('Failed to get server config:', err);
        }
      }

      // Load initial worktrees
      if (finalProjectPath) {
        try {
          const worktrees = await adapter.listWorktrees(finalProjectPath);
          setWorktrees(worktrees);
        } catch (err) {
          console.error('Failed to load worktrees:', err);
        }
      }
    } catch (error) {
      setConnecting(false);
      setError(error instanceof Error ? error.message : 'Failed to connect');
      console.error('WebSocket connection failed:', error);
    }
  }, [projectPath, setConnected, setConnecting, setError, setWorktrees, setProjectPath]);

  const disconnect = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.disconnect();
      adapterRef.current = null;
      setConnected(false);
    }
  }, [setConnected]);

  const getAdapter = useCallback(() => {
    return adapterRef.current;
  }, []);

  return {
    connect,
    disconnect,
    getAdapter,
  };
}