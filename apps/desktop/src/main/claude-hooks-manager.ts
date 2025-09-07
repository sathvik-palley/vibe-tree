import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const HOOKS_CONFIG = {
  hooks: {
    Notification: [
      {
        hooks: [
          {
            type: "command",
            command: `curl -X POST http://127.0.0.1:7878/notification -H "Content-Type: application/json" -d '{"type": "claude-needs-input", "worktree": "'$PWD'", "message": "'$CLAUDE_NOTIFICATION'"}' --silent --fail || true`
          }
        ]
      }
    ],
    Stop: [
      {
        hooks: [
          {
            type: "command", 
            command: `echo "$(date): Claude Stop hook triggered in $PWD" >> /tmp/claude-hooks.log && [ "$CLAUDE_STOP_HOOK_ACTIVE" != "true" ] && curl -X POST http://127.0.0.1:7878/notification -H "Content-Type: application/json" -d '{"type": "claude-finished", "worktree": "'$PWD'", "message": "Task completed"}' --silent --fail || true`
          }
        ]
      }
    ]
  }
};

interface ClaudeSettings {
  hooks?: Record<string, any>;
  [key: string]: any;
}

export class DesktopClaudeHooksManager {
  private globalSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  /**
   * Setup global Claude hooks in ~/.claude/settings.json
   */
  async ensureGlobalHooks(): Promise<void> {
    try {
      console.log('🔧 Setting up global Claude hooks...');
      
      // Ensure ~/.claude directory exists
      const claudeDir = path.dirname(this.globalSettingsPath);
      await fs.mkdir(claudeDir, { recursive: true });

      // Read existing settings or start fresh
      const settings = await this.readSettings(this.globalSettingsPath);
      
      // Merge hooks
      settings.hooks = { ...settings.hooks, ...HOOKS_CONFIG.hooks };
      
      // Write updated settings
      await fs.writeFile(this.globalSettingsPath, JSON.stringify(settings, null, 2));
      
      console.log('✅ Global Claude hooks configured');
    } catch (error) {
      console.error('❌ Failed to setup global Claude hooks:', error);
      throw error;
    }
  }

  /**
   * Setup Claude hooks for a specific project and all its worktrees
   */
  async ensureProjectHooks(projectPath: string): Promise<void> {
    try {
      console.log(`🔧 Setting up Claude hooks for project: ${projectPath}`);
      
      // Ensure project directory exists
      const projectStat = await fs.stat(projectPath);
      if (!projectStat.isDirectory()) {
        throw new Error(`Project path is not a directory: ${projectPath}`);
      }
      
      // Setup hooks in main project directory
      await this.setupHooksInDirectory(projectPath);
      
      // Get all worktrees and setup hooks in each
      const worktrees = await this.getWorktrees(projectPath);
      for (const worktree of worktrees) {
        if (worktree.path !== projectPath) { // Skip main project (already done)
          await this.setupHooksInDirectory(worktree.path);
        }
      }
      
      console.log(`✅ Claude hooks configured for ${projectPath} and ${worktrees.length - 1} worktrees`);
    } catch (error) {
      console.error(`❌ Failed to setup Claude hooks for ${projectPath}:`, error);
      // Don't throw - just log error and continue
    }
  }

  /**
   * Setup Claude hooks in a specific directory
   */
  private async setupHooksInDirectory(dirPath: string): Promise<void> {
    // Ensure .claude directory exists
    const claudeDir = path.join(dirPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    
    // Setup settings
    const settingsPath = path.join(claudeDir, 'settings.json');
    const settings = await this.readSettings(settingsPath);
    
    // Merge hooks
    settings.hooks = { ...settings.hooks, ...HOOKS_CONFIG.hooks };
    
    // Write updated settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    
    console.log(`  ✅ Hooks configured in ${dirPath}`);
  }

  /**
   * Get all worktrees for a project
   */
  private async getWorktrees(projectPath: string): Promise<Array<{ path: string; branch: string }>> {
    try {
      const { listWorktrees } = await import('@vibetree/core');
      const worktrees = await listWorktrees(projectPath);
      return worktrees.map(w => ({ path: w.path, branch: w.branch }));
    } catch (error) {
      console.log(`  ⚠️ Could not list worktrees for ${projectPath}, setting up main directory only`);
      return [{ path: projectPath, branch: 'main' }];
    }
  }

  /**
   * Setup Claude hooks for multiple projects
   */
  async ensureMultipleProjectHooks(projectPaths: string[]): Promise<void> {
    const results = await Promise.allSettled(
      projectPaths.map(path => this.ensureProjectHooks(path))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📊 Hook setup results: ${successful} successful, ${failed} failed`);
  }

  /**
   * Check if hooks are configured for a project
   */
  async getHooksStatus(projectPaths: string[] = []): Promise<{
    globalConfigured: boolean;
    projectsConfigured: string[];
  }> {
    const globalConfigured = await this.fileExists(this.globalSettingsPath);
    const projectsConfigured: string[] = [];
    
    for (const projectPath of projectPaths) {
      const settingsPath = path.join(projectPath, '.claude', 'settings.json');
      if (await this.fileExists(settingsPath)) {
        projectsConfigured.push(projectPath);
      }
    }
    
    return { globalConfigured, projectsConfigured };
  }

  /**
   * Read settings from file, returning empty object if file doesn't exist
   */
  private async readSettings(filePath: string): Promise<ClaudeSettings> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, return empty settings
      return {};
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}