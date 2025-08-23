import { ipcMain } from 'electron';
import * as pty from 'node-pty';
import { 
  getDefaultShell,
  getPtyOptions,
  writeToPty, 
  resizePty, 
  generateSessionId,
  onPtyData,
  onPtyExit,
  type IPty
} from '@vibetree/core';

interface ShellProcess {
  pty: IPty;
  worktreePath: string;
  processId: string;
  listeners: Map<string, { handler: (data: string) => void; disposable?: { dispose(): void } }>;
}

class ShellProcessManager {
  private processes: Map<string, ShellProcess> = new Map();

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    ipcMain.handle('shell:start', async (event, worktreePath: string, cols?: number, rows?: number) => {
      return this.startOrGetProcess(event.sender, worktreePath, cols, rows);
    });

    ipcMain.handle('shell:write', async (_, processId: string, data: string) => {
      return this.writeToProcess(processId, data);
    });

    ipcMain.handle('shell:resize', async (_, processId: string, cols: number, rows: number) => {
      return this.resizeProcess(processId, cols, rows);
    });

    ipcMain.handle('shell:status', async (_, processId: string) => {
      return { running: this.processes.has(processId) };
    });

    ipcMain.handle('shell:get-buffer', async (_, processId: string) => {
      return this.getProcessBuffer(processId);
    });
  }

  private getProcessId(worktreePath: string): string {
    return generateSessionId(worktreePath);
  }

  private async startOrGetProcess(sender: Electron.WebContents, worktreePath: string, cols?: number, rows?: number) {
    const processId = this.getProcessId(worktreePath);

    // Check if process already exists
    if (this.processes.has(processId)) {
      const existingProcess = this.processes.get(processId)!;
      
      // Create a unique listener ID for this sender
      const listenerId = sender.id.toString();
      
      // Remove old listener if exists
      const oldListenerInfo = existingProcess.listeners.get(listenerId);
      if (oldListenerInfo && oldListenerInfo.disposable) {
        oldListenerInfo.disposable.dispose();
        existingProcess.listeners.delete(listenerId);
      }
      
      // Create new listener
      const newListener = (data: string) => {
        sender.send(`shell:output:${processId}`, data);
      };
      
      // Attach new listener and store with disposable
      const disposable = onPtyData(existingProcess.pty, newListener);
      existingProcess.listeners.set(listenerId, { handler: newListener, disposable });
      
      return { success: true, processId, isNew: false };
    }

    try {
      // Create PTY instance
      const shell = getDefaultShell();
      const options = getPtyOptions(worktreePath, cols, rows);
      const ptyProcess = pty.spawn(shell, [], options);

      // Create process with listeners map
      const shellProcess: ShellProcess = {
        pty: ptyProcess,
        worktreePath,
        processId,
        listeners: new Map()
      };

      // Create initial listener for this sender
      const listenerId = sender.id.toString();
      const dataListener = (data: string) => {
        sender.send(`shell:output:${processId}`, data);
      };
      
      const disposable = onPtyData(ptyProcess, dataListener);
      shellProcess.listeners.set(listenerId, { handler: dataListener, disposable });
      
      this.processes.set(processId, shellProcess);

      // Handle PTY exit
      onPtyExit(ptyProcess, (exitCode) => {
        sender.send(`shell:exit:${processId}`, exitCode);
        this.processes.delete(processId);
      });

      // Log process creation
      console.log(`Started PTY process ${processId} in ${worktreePath}`);

      return { success: true, processId, isNew: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start PTY' 
      };
    }
  }

  private async writeToProcess(processId: string, data: string) {
    const process = this.processes.get(processId);
    if (!process || !process.pty) {
      console.error(`PTY not found: ${processId}`);
      return { success: false, error: 'PTY not found' };
    }

    try {
      writeToPty(process.pty, data);
      return { success: true };
    } catch (error) {
      console.error(`Error writing to PTY ${processId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to write to PTY' 
      };
    }
  }

  private async resizeProcess(processId: string, cols: number, rows: number) {
    const process = this.processes.get(processId);
    if (!process || !process.pty) {
      return { success: false, error: 'PTY not found' };
    }

    try {
      resizePty(process.pty, cols, rows);
      return { success: true };
    } catch (error) {
      console.error(`Error resizing PTY ${processId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resize PTY' 
      };
    }
  }

  private async getProcessBuffer(processId: string) {
    const process = this.processes.get(processId);
    if (!process || !process.pty) {
      return { success: false, error: 'PTY not found' };
    }

    // Note: node-pty doesn't provide direct buffer access
    // Buffer management should be handled on the renderer side
    return { success: true, buffer: null };
  }

  // Clean up all processes on app quit
  public cleanup() {
    for (const [, shell] of this.processes) {
      try {
        // Clean up all listeners
        for (const [, listenerInfo] of shell.listeners) {
          if (listenerInfo.disposable) {
            listenerInfo.disposable.dispose();
          }
        }
        shell.listeners.clear();
        shell.pty.kill();
      } catch (error) {
        console.error('Error killing PTY process:', error);
      }
    }
  }
}

export const shellProcessManager = new ShellProcessManager();