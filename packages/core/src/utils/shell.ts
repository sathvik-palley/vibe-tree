import * as pty from 'node-pty';
import * as crypto from 'crypto';

/**
 * Create a new PTY process for shell interaction
 * @param worktreePath - Directory to start the shell in
 * @param cols - Terminal columns (default: 80)
 * @param rows - Terminal rows (default: 30)
 * @returns PTY process instance
 */
export function createPtyProcess(
  worktreePath: string, 
  cols: number = 80, 
  rows: number = 30
): pty.IPty {
  const shell = process.platform === 'win32' 
    ? 'powershell.exe' 
    : process.env.SHELL || '/bin/bash';

  return pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: worktreePath,
    env: process.env as Record<string, string>
  });
}

/**
 * Write data to a PTY process
 * @param ptyProcess - The PTY process to write to
 * @param data - Data to write
 */
export function writeToPty(ptyProcess: pty.IPty, data: string): void {
  ptyProcess.write(data);
}

/**
 * Resize a PTY process terminal dimensions
 * @param ptyProcess - The PTY process to resize
 * @param cols - New column count
 * @param rows - New row count
 */
export function resizePty(ptyProcess: pty.IPty, cols: number, rows: number): void {
  ptyProcess.resize(cols, rows);
}

/**
 * Kill a PTY process
 * @param ptyProcess - The PTY process to kill
 */
export function killPty(ptyProcess: pty.IPty): void {
  ptyProcess.kill();
}

/**
 * Generate a deterministic session ID based on worktree path
 * @param worktreePath - Path to generate ID from
 * @returns 16-character hex string
 */
export function generateSessionId(worktreePath: string): string {
  return crypto.createHash('sha256')
    .update(worktreePath)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Attach a data listener to PTY process
 * @param ptyProcess - The PTY process
 * @param callback - Callback for data events
 * @returns Disposable to remove the listener
 */
export function onPtyData(
  ptyProcess: pty.IPty, 
  callback: (data: string) => void
): { dispose: () => void } {
  return ptyProcess.onData(callback);
}

/**
 * Attach an exit listener to PTY process
 * @param ptyProcess - The PTY process
 * @param callback - Callback for exit events
 * @returns Disposable to remove the listener
 */
export function onPtyExit(
  ptyProcess: pty.IPty, 
  callback: (exitCode: number) => void
): { dispose: () => void } {
  return ptyProcess.onExit((event) => callback(event.exitCode));
}