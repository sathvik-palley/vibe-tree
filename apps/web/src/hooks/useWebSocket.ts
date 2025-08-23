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
    projectPath 
  } = useAppStore();

  const connect = useCallback(async () => {
    if (adapterRef.current) {
      return; // Already connected
    }

    setConnecting(true);
    setError(null);

    try {
      // Get WebSocket URL from environment or use default
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
      
      // Create adapter (without JWT for now - will add auth later)
      const adapter = new WebSocketAdapter(wsUrl);
      adapterRef.current = adapter;

      // Wait for connection
      await adapter.connect();
      
      setConnected(true);
      setConnecting(false);

      // Load initial worktrees
      if (projectPath) {
        try {
          const worktrees = await adapter.listWorktrees(projectPath);
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
  }, [projectPath, setConnected, setConnecting, setError, setWorktrees]);

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