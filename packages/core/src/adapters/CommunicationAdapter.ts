import {
  Worktree,
  GitStatus,
  ShellSession,
  ShellStartResult,
  ShellWriteResult,
  ShellResizeResult,
  WorktreeAddResult,
  WorktreeRemoveResult,
  IDE
} from '../types';
import { ClaudeNotification } from '../notifications';

/**
 * Unified communication interface for VibeTree applications.
 * This adapter pattern allows the same application logic to work
 * across different environments (Electron IPC, WebSockets, etc.)
 */
export interface CommunicationAdapter {
  /**
   * Start a new shell session in the specified worktree directory
   * @param worktreePath - Path to the git worktree
   * @param cols - Initial terminal columns (default: 80)
   * @param rows - Initial terminal rows (default: 30)
   * @returns Shell session result with process ID
   */
  startShell(worktreePath: string, cols?: number, rows?: number): Promise<ShellStartResult>;
  
  /**
   * Write data to an active shell session
   * @param processId - ID of the shell process
   * @param data - Data to write (user input or commands)
   */
  writeToShell(processId: string, data: string): Promise<ShellWriteResult>;
  
  /**
   * Resize the terminal dimensions for a shell session
   * @param processId - ID of the shell process
   * @param cols - New column count
   * @param rows - New row count
   */
  resizeShell(processId: string, cols: number, rows: number): Promise<ShellResizeResult>;
  
  /**
   * Check if a shell session is still running
   * @param processId - ID of the shell process
   */
  getShellStatus(processId: string): Promise<{ running: boolean }>;
  
  /**
   * Subscribe to shell output events
   * @param processId - ID of the shell process
   * @param callback - Function to call when output is received
   * @returns Unsubscribe function
   */
  onShellOutput(processId: string, callback: (data: string) => void): () => void;
  
  /**
   * Subscribe to shell exit events
   * @param processId - ID of the shell process
   * @param callback - Function to call when shell exits
   * @returns Unsubscribe function
   */
  onShellExit(processId: string, callback: (code: number) => void): () => void;

  /**
   * List all git worktrees for a project
   * @param projectPath - Path to the main git repository
   * @returns Array of worktree information
   */
  listWorktrees(projectPath: string): Promise<Worktree[]>;
  
  /**
   * Get git status for a worktree
   * @param worktreePath - Path to the git worktree
   * @returns Array of file status information
   */
  getGitStatus(worktreePath: string): Promise<GitStatus[]>;
  
  /**
   * Get git diff for unstaged changes
   * @param worktreePath - Path to the git worktree
   * @param filePath - Optional specific file to diff
   * @returns Diff output as string
   */
  getGitDiff(worktreePath: string, filePath?: string): Promise<string>;
  
  /**
   * Get git diff for staged changes
   * @param worktreePath - Path to the git worktree
   * @param filePath - Optional specific file to diff
   * @returns Staged diff output as string
   */
  getGitDiffStaged(worktreePath: string, filePath?: string): Promise<string>;
  
  /**
   * Create a new git worktree with a new branch
   * @param projectPath - Path to the main git repository
   * @param branchName - Name for the new branch
   * @returns Result with new worktree path and branch name
   */
  addWorktree(projectPath: string, branchName: string): Promise<WorktreeAddResult>;
  
  /**
   * Remove a git worktree and optionally its branch
   * @param projectPath - Path to the main git repository
   * @param worktreePath - Path to the worktree to remove
   * @param branchName - Name of the branch to delete
   * @returns Result indicating success and any warnings
   */
  removeWorktree(projectPath: string, worktreePath: string, branchName: string): Promise<WorktreeRemoveResult>;

  /**
   * Detect installed IDEs on the system
   * @returns Array of available IDEs with their launch commands
   */
  detectIDEs(): Promise<IDE[]>;
  
  /**
   * Open a project in the specified IDE
   * @param ideName - Name of the IDE (e.g., 'vscode', 'cursor')
   * @param projectPath - Path to open in the IDE
   * @returns Success status and error message if failed
   */
  openInIDE(ideName: string, projectPath: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Open a directory selection dialog
   * @returns Selected directory path or undefined if cancelled
   */
  selectDirectory(): Promise<string | undefined>;

  /**
   * Subscribe to notifications for specific worktrees
   * @param worktreePaths - Array of worktree paths to subscribe to, empty array for all
   */
  subscribeToNotifications(worktreePaths?: string[]): Promise<{ success: boolean }>;

  /**
   * Unsubscribe from notifications
   * @param worktreePaths - Array of worktree paths to unsubscribe from, empty for all
   */
  unsubscribeFromNotifications(worktreePaths?: string[]): Promise<{ success: boolean }>;

  /**
   * Get list of notifications
   * @param worktreePath - Optional worktree path filter
   * @param unreadOnly - Only return unread notifications
   * @returns Array of notifications
   */
  getNotifications(worktreePath?: string, unreadOnly?: boolean): Promise<ClaudeNotification[]>;

  /**
   * Mark a notification as read
   * @param notificationId - ID of the notification to mark as read
   */
  markNotificationAsRead(notificationId: string): Promise<{ success: boolean }>;

  /**
   * Clear all notifications
   * @param worktreePath - Optional worktree path filter
   */
  clearAllNotifications(worktreePath?: string): Promise<{ count: number }>;

  /**
   * Subscribe to incoming notification events
   * @param callback - Function to call when a new notification is received
   * @returns Unsubscribe function
   */
  onNotification(callback: (notification: ClaudeNotification) => void): () => void;
  
  /**
   * Get the current system theme preference
   * @returns 'light' or 'dark'
   */
  getTheme(): Promise<'light' | 'dark'>;
  
  /**
   * Subscribe to system theme changes
   * @param callback - Function to call when theme changes
   * @returns Unsubscribe function
   */
  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void;
}

/**
 * Base implementation of CommunicationAdapter.
 * Concrete adapters (IPC, WebSocket) should extend this class.
 */
export abstract class BaseAdapter implements CommunicationAdapter {
  abstract startShell(worktreePath: string, cols?: number, rows?: number): Promise<ShellStartResult>;
  abstract writeToShell(processId: string, data: string): Promise<ShellWriteResult>;
  abstract resizeShell(processId: string, cols: number, rows: number): Promise<ShellResizeResult>;
  abstract getShellStatus(processId: string): Promise<{ running: boolean }>;
  abstract onShellOutput(processId: string, callback: (data: string) => void): () => void;
  abstract onShellExit(processId: string, callback: (code: number) => void): () => void;
  
  abstract listWorktrees(projectPath: string): Promise<Worktree[]>;
  abstract getGitStatus(worktreePath: string): Promise<GitStatus[]>;
  abstract getGitDiff(worktreePath: string, filePath?: string): Promise<string>;
  abstract getGitDiffStaged(worktreePath: string, filePath?: string): Promise<string>;
  abstract addWorktree(projectPath: string, branchName: string): Promise<WorktreeAddResult>;
  abstract removeWorktree(projectPath: string, worktreePath: string, branchName: string): Promise<WorktreeRemoveResult>;
  
  abstract detectIDEs(): Promise<IDE[]>;
  abstract openInIDE(ideName: string, projectPath: string): Promise<{ success: boolean; error?: string }>;
  
  abstract selectDirectory(): Promise<string | undefined>;
  
  abstract subscribeToNotifications(worktreePaths?: string[]): Promise<{ success: boolean }>;
  abstract unsubscribeFromNotifications(worktreePaths?: string[]): Promise<{ success: boolean }>;
  abstract getNotifications(worktreePath?: string, unreadOnly?: boolean): Promise<ClaudeNotification[]>;
  abstract markNotificationAsRead(notificationId: string): Promise<{ success: boolean }>;
  abstract clearAllNotifications(worktreePath?: string): Promise<{ count: number }>;
  abstract onNotification(callback: (notification: ClaudeNotification) => void): () => void;
  
  abstract getTheme(): Promise<'light' | 'dark'>;
  abstract onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void;
}