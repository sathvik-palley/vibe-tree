import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { 
  connectGlobalAdapter, 
  disconnectGlobalAdapter, 
  getGlobalAdapter, 
  isConnected,
  onGlobalAdapterConnected,
  onGlobalAdapterDisconnected
} from '../adapters/globalWebSocketAdapter';
import { getServerWebSocketUrl } from '../services/portDiscovery';

export function useWebSocket() {
  const { 
    setConnected, 
    setConnecting, 
    setError
  } = useAppStore();

  // Local state to force re-renders when adapter changes
  const [adapterVersion, setAdapterVersion] = useState(0);

  const connect = useCallback(async () => {
    if (isConnected()) {
      console.log('🔌 Already connected to global adapter');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Get WebSocket URL from environment or construct from current host
      let baseWsUrl = import.meta.env.VITE_WS_URL;
      
      console.log('🔍 Environment VITE_WS_URL:', baseWsUrl);
      console.log('🔍 Current window.location:', window.location);
      
      if (!baseWsUrl) {
        // If accessing from network (not localhost), use the same host but port 3002
        const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
        
        console.log('🔍 Is localhost?', isLocalhost);
        
        if (isLocalhost) {
          baseWsUrl = 'ws://localhost:3002';
        } else {
          // Use the same host but different port for network access
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          baseWsUrl = `${protocol}//${window.location.hostname}:3002`;
        }
      }

      // Get WebSocket URL using dynamic port discovery
      const wsUrl = await getServerWebSocketUrl();
      
      // Add session token to WebSocket URL if authenticated
      const { getWebSocketUrl } = await import('@vibetree/auth');
      
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      
      await connectGlobalAdapter(wsUrl);
      
      setConnected(true);
      setConnecting(false);
      setAdapterVersion(prev => prev + 1); // Force re-render

    } catch (error) {
      setConnecting(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect';
      setError(errorMessage);
      console.error('💔 WebSocket connection failed with error:', error);
      console.error('💔 Error details:', {
        message: errorMessage,
        type: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, [setConnected, setConnecting, setError]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting global WebSocket adapter');
    disconnectGlobalAdapter();
    setConnected(false);
    setAdapterVersion(prev => prev + 1); // Force re-render
  }, [setConnected]);

  const getAdapter = useCallback(() => {
    const adapter = getGlobalAdapter();
    console.log('🔍 getAdapter called, globalAdapter:', adapter);
    return adapter;
  }, [adapterVersion]); // Re-run when adapter changes

  // Subscribe to global adapter state changes
  useEffect(() => {
    const unsubscribeConnected = onGlobalAdapterConnected(() => {
      console.log('🔌 Global adapter connected callback');
      setConnected(true);
      setAdapterVersion(prev => prev + 1);
    });

    const unsubscribeDisconnected = onGlobalAdapterDisconnected(() => {
      console.log('💔 Global adapter disconnected callback');
      setConnected(false);
      setAdapterVersion(prev => prev + 1);
    });

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
    };
  }, [setConnected]);

  return {
    connect,
    disconnect,
    getAdapter,
  };
}