import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { ShellStartResult, ShellWriteResult, ShellResizeResult } from '@vibetree/core';

interface ShellSession {
  id: string;
  pty: pty.IPty;
  worktreePath: string;
  userId?: string;
  createdAt: Date;
  lastActivity: Date;
}

export class ShellManager {
  private sessions: Map<string, ShellSession> = new Map();
  private sessionTimeoutMs = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Clean up inactive sessions periodically
    setInterval(() => this.cleanupInactiveSessions(), 60000); // Every minute
  }

  async startShell(worktreePath: string, userId?: string, cols = 80, rows = 30): Promise<ShellStartResult> {
    try {
      const sessionId = uuidv4();
      const shell = process.platform === 'win32' 
        ? 'powershell.exe' 
        : process.env.SHELL || '/bin/bash';

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: worktreePath,
        env: process.env as Record<string, string>
      });

      const session: ShellSession = {
        id: sessionId,
        pty: ptyProcess,
        worktreePath,
        userId,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      this.sessions.set(sessionId, session);

      ptyProcess.onExit(() => {
        this.sessions.delete(sessionId);
      });

      return {
        success: true,
        processId: sessionId,
        isNew: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start shell'
      };
    }
  }

  async writeToShell(sessionId: string, data: string): Promise<ShellWriteResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      session.pty.write(data);
      session.lastActivity = new Date();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write to shell'
      };
    }
  }

  async resizeShell(sessionId: string, cols: number, rows: number): Promise<ShellResizeResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      session.pty.resize(cols, rows);
      session.lastActivity = new Date();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resize shell'
      };
    }
  }

  getSession(sessionId: string): ShellSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  getAllSessions(userId?: string): ShellSession[] {
    const sessions = Array.from(this.sessions.values());
    if (userId) {
      return sessions.filter(s => s.userId === userId);
    }
    return sessions;
  }

  terminateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.pty.kill();
        this.sessions.delete(sessionId);
        return true;
      } catch (error) {
        console.error('Error terminating session:', error);
        return false;
      }
    }
    return false;
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > this.sessionTimeoutMs) {
        console.log(`Cleaning up inactive session: ${sessionId}`);
        this.terminateSession(sessionId);
      }
    }
  }
}