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

export class ClaudeHooksManager {
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
      
      // Merge our hooks with existing settings
      const updatedSettings: ClaudeSettings = {
        ...settings,
        hooks: {
          ...settings.hooks,
          ...HOOKS_CONFIG.hooks
        }
      };

      // Write back the settings
      await fs.writeFile(
        this.globalSettingsPath,
        JSON.stringify(updatedSettings, null, 2),
        'utf-8'
      );

      console.log(`✅ Global Claude hooks configured: ${this.globalSettingsPath}`);
      
    } catch (error) {
      console.error('❌ Failed to setup global Claude hooks:', error);
      throw error;
    }
  }

  /**
   * Setup project-specific Claude hooks in {projectPath}/.claude/settings.json
   */
  async ensureProjectHooks(projectPath: string): Promise<void> {
    try {
      console.log(`🔧 Setting up Claude hooks for project: ${projectPath}`);
      
      // Create .claude directory in project
      const claudeDir = path.join(projectPath, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });

      // Create settings.json path
      const settingsPath = path.join(claudeDir, 'settings.json');

      // Read existing settings or start fresh
      const settings = await this.readSettings(settingsPath);

      // Merge hooks
      const updatedSettings: ClaudeSettings = {
        ...settings,
        hooks: {
          ...settings.hooks,
          ...HOOKS_CONFIG.hooks
        }
      };

      await fs.writeFile(
        settingsPath,
        JSON.stringify(updatedSettings, null, 2),
        'utf-8'
      );

      console.log(`✅ Project Claude hooks configured: ${settingsPath}`);
      
    } catch (error) {
      console.error(`❌ Failed to setup project Claude hooks for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Setup hooks for multiple projects at once
   */
  async ensureMultipleProjectHooks(projectPaths: string[]): Promise<void> {
    const results = await Promise.allSettled(
      projectPaths.map(projectPath => this.ensureProjectHooks(projectPath))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`🔧 Claude hooks setup complete: ${successful} succeeded, ${failed} failed`);

    if (failed > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason);
      console.error('Failed projects:', errors);
    }
  }

  /**
   * Verify if hooks are properly configured in a project
   */
  async verifyProjectHooks(projectPath: string): Promise<boolean> {
    try {
      const settingsPath = path.join(projectPath, '.claude', 'settings.json');
      const settings = await this.readSettings(settingsPath);
      
      return !!(
        settings.hooks?.Stop?.[0]?.hooks?.[0]?.command?.includes('127.0.0.1:7878') &&
        settings.hooks?.Notification?.[0]?.hooks?.[0]?.command?.includes('127.0.0.1:7878')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get status of hooks configuration across projects
   */
  async getHooksStatus(projectPaths: string[]): Promise<{
    globalConfigured: boolean;
    projectsConfigured: Array<{ path: string; configured: boolean }>;
  }> {
    // Check global hooks
    const globalConfigured = await this.verifyProjectHooks(os.homedir());

    // Check project hooks
    const projectsConfigured = await Promise.all(
      projectPaths.map(async (projectPath) => ({
        path: projectPath,
        configured: await this.verifyProjectHooks(projectPath)
      }))
    );

    return {
      globalConfigured,
      projectsConfigured
    };
  }

  /**
   * Helper method to safely read JSON settings
   */
  private async readSettings(settingsPath: string): Promise<ClaudeSettings> {
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, return empty settings
      return {};
    }
  }
}

export const claudeHooksManager = new ClaudeHooksManager();