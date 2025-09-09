import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, AuthState, LoginCredentials } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const checkAuthRequirement = async () => {
      try {
        // First check if auth is required from server
        const serverUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:3002';
        const apiUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
        
        const response = await fetch(`${apiUrl}/api/config`);
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        const config = await response.json();
        
        if (!config.authRequired) {
          // Auth not required, user is automatically authenticated
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        }

        // Auth is required, check localStorage for existing session
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const hasSessionToken = localStorage.getItem('sessionToken') !== null;
        
        setAuthState({
          isAuthenticated: isAuthenticated && hasSessionToken,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        // Server unreachable - show error instead of assuming no auth
        console.error('Could not check server auth config:', error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: 'Cannot connect to server. Please check if the server is running.',
        });
      }
    };

  const retry = () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    checkAuthRequirement();
  };

  useEffect(() => {
    checkAuthRequirement();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get server URL
      const serverUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:3002';
      const apiUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      
      // Send credentials to backend for validation
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('isAuthenticated', 'true');
        if (result.token) {
          localStorage.setItem('sessionToken', result.token);
        }
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('sessionToken');
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    retry,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };