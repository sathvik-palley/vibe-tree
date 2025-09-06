import { BaseAdapter } from '@vibetree/core';
import type {
  Worktree,
  GitStatus,
  ShellStartResult,
  ShellWriteResult,
  ShellResizeResult,
  WorktreeAddResult,
  WorktreeRemoveResult,
  IDE,
  ClaudeNotification
} from '@vibetree/core';

export class IPCAdapter extends BaseAdapter {
  async startShell(worktreePath: string, cols?: number, rows?: number): Promise<ShellStartResult> {
    return window.electronAPI.shell.start(worktreePath, cols, rows);
  }

  async writeToShell(processId: string, data: string): Promise<ShellWriteResult> {
    return window.electronAPI.shell.write(processId, data);
  }

  async resizeShell(processId: string, cols: number, rows: number): Promise<ShellResizeResult> {
    return window.electronAPI.shell.resize(processId, cols, rows);
  }

  async getShellStatus(processId: string): Promise<{ running: boolean }> {
    return window.electronAPI.shell.status(processId);
  }

  onShellOutput(processId: string, callback: (data: string) => void): () => void {
    return window.electronAPI.shell.onOutput(processId, callback);
  }

  onShellExit(processId: string, callback: (code: number) => void): () => void {
    return window.electronAPI.shell.onExit(processId, callback);
  }

  async listWorktrees(projectPath: string): Promise<Worktree[]> {
    return window.electronAPI.git.listWorktrees(projectPath);
  }

  async getGitStatus(worktreePath: string): Promise<GitStatus[]> {
    return window.electronAPI.git.getStatus(worktreePath);
  }

  async getGitDiff(worktreePath: string, filePath?: string): Promise<string> {
    return window.electronAPI.git.getDiff(worktreePath, filePath);
  }

  async getGitDiffStaged(worktreePath: string, filePath?: string): Promise<string> {
    return window.electronAPI.git.getDiffStaged(worktreePath, filePath);
  }

  async addWorktree(projectPath: string, branchName: string): Promise<WorktreeAddResult> {
    return window.electronAPI.git.addWorktree(projectPath, branchName);
  }

  async removeWorktree(projectPath: string, worktreePath: string, branchName: string): Promise<WorktreeRemoveResult> {
    return window.electronAPI.git.removeWorktree(projectPath, worktreePath, branchName);
  }

  async detectIDEs(): Promise<IDE[]> {
    return window.electronAPI.ide.detect();
  }

  async openInIDE(ideName: string, projectPath: string): Promise<{ success: boolean; error?: string }> {
    return window.electronAPI.ide.open(ideName, projectPath);
  }

  async selectDirectory(): Promise<string | undefined> {
    return window.electronAPI.dialog.selectDirectory();
  }

  async subscribeToNotifications(worktreePaths?: string[]): Promise<{ success: boolean }> {
    // For desktop, we'll need to implement this in the main process
    // For now, assume it's always successful since desktop gets notifications via server
    return { success: true };
  }

  async unsubscribeFromNotifications(worktreePaths?: string[]): Promise<{ success: boolean }> {
    // For desktop, notifications are handled via the notification service
    return { success: true };
  }

  async getNotifications(worktreePath?: string, unreadOnly?: boolean): Promise<ClaudeNotification[]> {
    // This would need to be implemented in the main process to communicate with the server
    return window.electronAPI.notifications?.getNotifications(worktreePath, unreadOnly) || [];
  }

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    return window.electronAPI.notifications?.markAsRead(notificationId) || { success: false };
  }

  async clearAllNotifications(worktreePath?: string): Promise<{ count: number }> {
    return window.electronAPI.notifications?.clearAll(worktreePath) || { count: 0 };
  }

  onNotification(callback: (notification: ClaudeNotification) => void): () => void {
    return window.electronAPI.notifications?.onNotification(callback) || (() => {});
  }

  async getTheme(): Promise<'light' | 'dark'> {
    return window.electronAPI.theme.get();
  }

  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void {
    return window.electronAPI.theme.onChange(callback);
  }
}