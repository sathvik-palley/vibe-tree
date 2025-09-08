import { ipcMain } from 'electron';
import * as pty from 'node-pty';
import { ShellSessionManager } from '@vibetree/core';

/**
 * Desktop shell manager - thin wrapper around shared ShellSessionManager
 * Handles IPC communication with renderer process
 */
class DesktopShellManager {
  private sessionManager = ShellSessionManager.getInstance();

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    ipcMain.handle('shell:start', async (event, worktreePath: string, cols?: number, rows?: number, forceNew?: boolean, terminalId?: string) => {
      // Start session with node-pty spawn function
      const result = await this.sessionManager.startSession(
        worktreePath,
        cols,
        rows,
        pty.spawn,
        forceNew,
        terminalId
      );

      if (result.success && result.processId) {
        const processId = result.processId;
        const listenerId = `electron-${event.sender.id}`;
        
        // Only add listeners for new sessions or if they don't exist
        // For existing sessions, listeners should already be set up
        if (result.isNew) {
          // Add output listener
          this.sessionManager.addOutputListener(processId, listenerId, (data) => {
            try {
              if (!event.sender.isDestroyed()) {
                event.sender.send(`shell:output:${processId}`, data);
              }
            } catch (error) {
              // Frame was disposed between check and send - remove this listener
              this.sessionManager.removeOutputListener(processId, listenerId);
            }
          });

          // Add exit listener
          this.sessionManager.addExitListener(processId, listenerId, (exitCode) => {
            try {
              if (!event.sender.isDestroyed()) {
                event.sender.send(`shell:exit:${processId}`, exitCode);
              }
            } catch (error) {
              // Frame was disposed between check and send - remove this listener
              this.sessionManager.removeExitListener(processId, listenerId);
            }
          });
        } else {
          // For existing sessions, we need to update the listener to use the current event.sender
          // because the renderer might have changed
          this.sessionManager.removeOutputListener(processId, listenerId);
          this.sessionManager.removeExitListener(processId, listenerId);
          
          // Re-add with current sender, but skip buffer replay for existing sessions
          this.sessionManager.addOutputListener(processId, listenerId, (data) => {
            try {
              if (!event.sender.isDestroyed()) {
                event.sender.send(`shell:output:${processId}`, data);
              }
            } catch (error) {
              // Frame was disposed between check and send - remove this listener
              this.sessionManager.removeOutputListener(processId, listenerId);
            }
          }, true); // Skip replay for existing sessions

          this.sessionManager.addExitListener(processId, listenerId, (exitCode) => {
            try {
              if (!event.sender.isDestroyed()) {
                event.sender.send(`shell:exit:${processId}`, exitCode);
              }
            } catch (error) {
              // Frame was disposed between check and send - remove this listener
              this.sessionManager.removeExitListener(processId, listenerId);
            }
          });
        }
      }

      return result;
    });

    ipcMain.handle('shell:write', async (_, processId: string, data: string) => {
      return this.sessionManager.writeToSession(processId, data);
    });

    ipcMain.handle('shell:resize', async (_, processId: string, cols: number, rows: number) => {
      return this.sessionManager.resizeSession(processId, cols, rows);
    });

    ipcMain.handle('shell:status', async (_, processId: string) => {
      return { running: this.sessionManager.hasSession(processId) };
    });

    ipcMain.handle('shell:get-buffer', async () => {
      // Buffer management handled on renderer side
      return { success: true, buffer: null };
    });
  }

  // Clean up on app quit
  public cleanup() {
    this.sessionManager.cleanup();
  }
}

export const shellProcessManager = new DesktopShellManager();