import { spawn } from 'child_process';
import path from 'path';
import { 
  Worktree, 
  GitStatus, 
  WorktreeAddResult, 
  WorktreeRemoveResult,
  parseWorktrees,
  parseGitStatus 
} from '@vibetree/core';

/**
 * Service for handling git operations on the server.
 * Executes git commands and parses their output using shared utilities.
 */
export class GitService {
  async listWorktrees(projectPath: string): Promise<Worktree[]> {
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
  }

  async getStatus(worktreePath: string): Promise<GitStatus[]> {
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
  }

  async getDiff(worktreePath: string, filePath?: string): Promise<string> {
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
  }

  async getDiffStaged(worktreePath: string, filePath?: string): Promise<string> {
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
  }

  async addWorktree(projectPath: string, branchName: string): Promise<WorktreeAddResult> {
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
  }

  async removeWorktree(projectPath: string, worktreePath: string, branchName: string): Promise<WorktreeRemoveResult> {
    return new Promise((resolve, reject) => {
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
  }

}