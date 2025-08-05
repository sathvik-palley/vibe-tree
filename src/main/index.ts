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
    icon: path.join(__dirname, '../../assets/icons/VibeTree.png'),
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

// Git diff and status operations
ipcMain.handle('git:status', async (_, worktreePath: string) => {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['status', '--porcelain=v1'], {
      cwd: worktreePath
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
        resolve(parseGitStatus(stdout));
      } else {
        reject(new Error(stderr || 'Failed to get git status'));
      }
    });
  });
});

ipcMain.handle('git:diff', async (_, worktreePath: string, filePath?: string) => {
  return new Promise((resolve, reject) => {
    const args = ['diff'];
    if (filePath) {
      args.push(filePath);
    }

    const child = spawn('git', args, {
      cwd: worktreePath
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
        resolve(stdout);
      } else {
        reject(new Error(stderr || 'Failed to get git diff'));
      }
    });
  });
});

ipcMain.handle('git:diff-staged', async (_, worktreePath: string, filePath?: string) => {
  return new Promise((resolve, reject) => {
    const args = ['diff', '--staged'];
    if (filePath) {
      args.push(filePath);
    }

    const child = spawn('git', args, {
      cwd: worktreePath
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
        resolve(stdout);
      } else {
        reject(new Error(stderr || 'Failed to get staged git diff'));
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

ipcMain.handle('git:worktree-remove', async (_, projectPath: string, worktreePath: string, branchName: string) => {
  return new Promise((resolve, reject) => {
    // First remove the worktree
    const removeWorktree = spawn('git', ['worktree', 'remove', worktreePath, '--force'], {
      cwd: projectPath
    });

    let stderr = '';

    removeWorktree.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    removeWorktree.on('close', (code) => {
      if (code === 0) {
        // Then delete the branch
        const deleteBranch = spawn('git', ['branch', '-D', branchName], {
          cwd: projectPath
        });

        let branchStderr = '';

        deleteBranch.stderr.on('data', (data) => {
          branchStderr += data.toString();
        });

        deleteBranch.on('close', (branchCode) => {
          if (branchCode === 0) {
            resolve({ success: true });
          } else {
            // If branch deletion fails, still consider it success since worktree was removed
            console.warn('Failed to delete branch but worktree was removed:', branchStderr);
            resolve({ success: true, warning: `Worktree removed but failed to delete branch: ${branchStderr}` });
          }
        });
      } else {
        reject(new Error(stderr || 'Failed to remove worktree'));
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
  let current: { path?: string; branch?: string; head?: string } = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (current.path && current.branch && current.head) {
        worktrees.push(current as { path: string; branch: string; head: string });
      }
      current = { path: line.substring(9) };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.substring(5);
    } else if (line.startsWith('branch ')) {
      current.branch = line.substring(7);
    }
  }

  if (current.path && current.branch && current.head) {
    worktrees.push(current as { path: string; branch: string; head: string });
  }

  return worktrees;
}

function parseGitStatus(output: string): Array<{ path: string; status: string; staged: boolean; modified: boolean }> {
  const lines = output.trim().split('\n').filter(line => line.length > 0);
  return lines.map(line => {
    const status = line.substring(0, 2);
    const path = line.substring(3);
    return {
      path,
      status,
      staged: status[0] !== ' ' && status[0] !== '?',
      modified: status[1] !== ' ' && status[1] !== '?'
    };
  });
}