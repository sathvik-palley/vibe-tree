import { app, BrowserWindow, ipcMain, nativeTheme, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { shellProcessManager } from './shell-manager';
import './ide-detector';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // In development, load from Vite dev server
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// Clean up shell processes on quit
app.on('before-quit', () => {
  shellProcessManager.cleanup();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for git worktree operations
ipcMain.handle('git:worktree-list', async (_, projectPath: string) => {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['worktree', 'list', '--porcelain'], {
      cwd: projectPath
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        const worktrees = parseWorktrees(stdout);
        resolve(worktrees);
      } else {
        reject(new Error(stderr || 'Failed to list worktrees'));
      }
    });
  });
});

ipcMain.handle('git:worktree-add', async (_, projectPath: string, branchName: string) => {
  const worktreePath = path.join(projectPath, '..', `${path.basename(projectPath)}-${branchName}`);
  
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['worktree', 'add', '-b', branchName, worktreePath], {
      cwd: projectPath
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ path: worktreePath, branch: branchName });
      } else {
        reject(new Error(stderr || 'Failed to create worktree'));
      }
    });
  });
});

// Claude process manager is initialized in claude-manager.ts

// Theme handling
ipcMain.handle('theme:get', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});

// Dialog handling
ipcMain.handle('dialog:select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

function parseWorktrees(output: string): Array<{ path: string; branch: string; head: string }> {
  const lines = output.trim().split('\n');
  const worktrees = [];
  let current: any = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (current.path) {
        worktrees.push(current);
      }
      current = { path: line.substring(9) };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.substring(5);
    } else if (line.startsWith('branch ')) {
      current.branch = line.substring(7);
    }
  }

  if (current.path) {
    worktrees.push(current);
  }

  return worktrees;
}