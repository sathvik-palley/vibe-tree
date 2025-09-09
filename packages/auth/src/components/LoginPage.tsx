import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { clsx } from 'clsx';

// Utility function similar to desktop app
const cn = (...inputs: any[]) => {
  return clsx(inputs);
};

// Button component styles (copied from desktop app)
const buttonVariants = (variant: 'default' | 'secondary' | 'outline' | 'ghost' = 'default', size: 'default' | 'sm' | 'lg' | 'icon' = 'default') => {
  const baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return cn(baseClass, variants[variant], sizes[size]);
};

// Input component styles (copied from desktop app)
const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, retry } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      await login({ username, password });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      {/* Login form */}
      <div className="w-screen max-w-xs sm:max-w-sm space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome to VibeTree</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLoading ? 'Connecting to server...' : 'Please sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5 sm:mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className={inputClass}
                disabled={isLoading || Boolean(error && error.includes('connect to server'))}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5 sm:mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={inputClass}
                disabled={isLoading || Boolean(error && error.includes('connect to server'))}
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 sm:p-4">
              <p className="break-words">{error}</p>
              {error.includes('connect to server') && (
                <button
                  type="button"
                  onClick={retry}
                  className={buttonVariants('outline', 'sm') + ' mt-2 w-full sm:w-auto'}
                  disabled={isLoading}
                >
                  Retry Connection
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            className={buttonVariants('default', 'default') + ' w-full h-11 sm:h-10'}
            disabled={isLoading || !username || !password || Boolean(error && error.includes('connect to server'))}
          >
            {isLoading ? 'Signing in...' : (error && error.includes('connect to server')) ? 'Server Unavailable' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs sm:text-sm text-muted-foreground">
          <p>Enter your credentials to access the application</p>
        </div>
      </div>
    </div>
  );
};