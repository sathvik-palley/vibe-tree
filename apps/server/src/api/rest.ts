import { Express } from 'express';
import { ShellManager } from '../services/ShellManager';
import { GitService } from '../services/GitService';
import { AuthService } from '../auth/AuthService';

interface Services {
  shellManager: ShellManager;
  gitService: GitService;
  authService: AuthService;
}

export function setupRestRoutes(app: Express, services: Services) {
  const { shellManager, gitService, authService } = services;

  // Generate QR code for device pairing
  app.get('/api/auth/qr', async (req, res) => {
    try {
      const port = parseInt(process.env.PORT || '3001');
      const result = await authService.generateQRCode(port);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // List connected devices
  app.get('/api/devices', (req, res) => {
    const devices = authService.getConnectedDevices();
    res.json(devices);
  });

  // Disconnect a device
  app.delete('/api/devices/:deviceId', (req, res) => {
    const success = authService.disconnectDevice(req.params.deviceId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  });

  // List active shell sessions
  app.get('/api/shells', (req, res) => {
    const sessions = shellManager.getAllSessions();
    res.json(sessions.map(s => ({
      id: s.id,
      worktreePath: s.worktreePath,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity
    })));
  });

  // Terminate a shell session
  app.delete('/api/shells/:sessionId', (req, res) => {
    const success = shellManager.terminateSession(req.params.sessionId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  });

  // Git operations (for non-WebSocket clients)
  app.post('/api/git/worktrees', async (req, res) => {
    try {
      const worktrees = await gitService.listWorktrees(req.body.projectPath);
      res.json(worktrees);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/git/status', async (req, res) => {
    try {
      const status = await gitService.getStatus(req.body.worktreePath);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/git/diff', async (req, res) => {
    try {
      const diff = await gitService.getDiff(req.body.worktreePath, req.body.filePath);
      res.json({ diff });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/git/worktree/add', async (req, res) => {
    try {
      const result = await gitService.addWorktree(req.body.projectPath, req.body.branchName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/git/worktree', async (req, res) => {
    try {
      const result = await gitService.removeWorktree(
        req.body.projectPath,
        req.body.worktreePath,
        req.body.branchName
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
}