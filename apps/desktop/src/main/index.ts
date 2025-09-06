import { app, BrowserWindow, ipcMain, nativeTheme, dialog, Notification } from 'electron';
import path from 'path';
import { shellProcessManager } from './shell-manager';
import './ide-detector';
import {
  listWorktrees,
  getGitStatus,
  getGitDiff,
  getGitDiffStaged,
  addWorktree,
  removeWorktree
} from '@vibetree/core';

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
    mainWindow.loadURL('http://localhost:5174');
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
  return listWorktrees(projectPath);
});

// Git diff and status operations
ipcMain.handle('git:status', async (_, worktreePath: string) => {
  return getGitStatus(worktreePath);
});

ipcMain.handle('git:diff', async (_, worktreePath: string, filePath?: string) => {
  return getGitDiff(worktreePath, filePath);
});

ipcMain.handle('git:diff-staged', async (_, worktreePath: string, filePath?: string) => {
  return getGitDiffStaged(worktreePath, filePath);
});

ipcMain.handle('git:worktree-add', async (_, projectPath: string, branchName: string) => {
  return addWorktree(projectPath, branchName);
});

ipcMain.handle('git:worktree-remove', async (_, projectPath: string, worktreePath: string, branchName: string) => {
  return removeWorktree(projectPath, worktreePath, branchName);
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

// Notification handling
ipcMain.handle('notification:show', async (_, options: { title: string; body: string; type: 'claude-finished' | 'claude-needs-input' }) => {
  if (!Notification.isSupported()) {
    return { success: false, error: 'Notifications not supported' };
  }

  try {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: path.join(__dirname, '../../assets/icons/VibeTree.png'),
      silent: false // Enable system sound
    });

    notification.on('click', () => {
      // Focus the app when notification is clicked
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
      }
    });

    notification.show();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Parsing functions are now imported from @vibetree/core