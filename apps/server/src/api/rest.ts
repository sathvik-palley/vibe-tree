import { Express } from 'express';
import { ShellManager } from '../services/ShellManager';
import { AuthService } from '../auth/AuthService';
import { NotificationService } from '../services/NotificationService';
import { claudeHooksManager } from '../services/ClaudeHooksManager';
import {
  listWorktrees,
  getGitStatus,
  getGitDiff,
  addWorktree,
  removeWorktree,
  validateProjects
} from '@vibetree/core';

interface Services {
  shellManager: ShellManager;
  authService: AuthService;
  notificationService: NotificationService;
}

export function setupRestRoutes(app: Express, services: Services) {
  const { shellManager, authService } = services;
  
  // Get server configuration
  app.get('/api/config', (req, res) => {
    res.json({
      projectPath: process.env.PROJECT_PATH || process.cwd(),
      version: '0.0.1'
    });
  });

  // Generate QR code for device pairing
  app.get('/api/auth/qr', async (req, res) => {
    try {
      const port = parseInt(process.env.PORT || '3002');
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
      const worktrees = await listWorktrees(req.body.projectPath);
      res.json(worktrees);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/git/worktrees', async (req, res) => {
    try {
      const projectPath = req.query.projectPath as string;
      if (!projectPath) {
        return res.status(400).json({ error: 'projectPath query parameter is required' });
      }
      const worktrees = await listWorktrees(projectPath);
      res.json(worktrees);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/git/status', async (req, res) => {
    try {
      const status = await getGitStatus(req.body.worktreePath);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/git/diff', async (req, res) => {
    try {
      const diff = await getGitDiff(req.body.worktreePath, req.body.filePath);
      res.json({ diff });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/git/worktree/add', async (req, res) => {
    try {
      const result = await addWorktree(req.body.projectPath, req.body.branchName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/git/worktree', async (req, res) => {
    try {
      const result = await removeWorktree(
        req.body.projectPath,
        req.body.worktreePath,
        req.body.branchName
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Validate multiple project paths
  app.post('/api/projects/validate', async (req, res) => {
    try {
      const { projectPaths } = req.body;
      
      if (!Array.isArray(projectPaths)) {
        return res.status(400).json({ error: 'projectPaths must be an array' });
      }
      
      if (projectPaths.length === 0) {
        return res.json([]);
      }
      
      if (projectPaths.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 projects can be validated at once' });
      }
      
      const results = await validateProjects(projectPaths);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Auto-load projects from environment variable
  app.get('/api/projects/auto-load', async (req, res) => {
    try {
      const defaultProjectsEnv = process.env.DEFAULT_PROJECTS;
      
      if (!defaultProjectsEnv || defaultProjectsEnv.trim() === '') {
        return res.json({ 
          projectPaths: [], 
          validationResults: [], 
          defaultProjectPath: null 
        });
      }
      
      // Parse comma-separated project paths
      const projectPaths = defaultProjectsEnv
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0);
      
      if (projectPaths.length === 0) {
        return res.json({ 
          projectPaths: [], 
          validationResults: [], 
          defaultProjectPath: null 
        });
      }
      
      if (projectPaths.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 projects can be configured in DEFAULT_PROJECTS' });
      }
      
      // Validate all projects
      const validationResults = await validateProjects(projectPaths);
      
      // First valid project becomes the default
      const defaultProjectPath = validationResults.find(result => result.valid)?.path || null;
      
      res.json({
        projectPaths,
        validationResults,
        defaultProjectPath
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Claude hooks management endpoints
  app.post('/api/claude/hooks/setup', async (req, res) => {
    try {
      const { projectPaths, includeGlobal = true } = req.body;

      if (includeGlobal) {
        await claudeHooksManager.ensureGlobalHooks();
      }

      if (projectPaths && Array.isArray(projectPaths)) {
        await claudeHooksManager.ensureMultipleProjectHooks(projectPaths);
      }

      res.json({ 
        success: true,
        message: 'Claude hooks setup completed',
        globalSetup: includeGlobal,
        projectsSetup: projectPaths?.length || 0
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });


}