import { 
  Worktree, 
  GitStatus, 
  WorktreeAddResult, 
  WorktreeRemoveResult,
  listWorktrees as listWorktreesUtil,
  getGitStatus as getGitStatusUtil,
  getGitDiff as getGitDiffUtil,
  getGitDiffStaged as getGitDiffStagedUtil,
  addWorktree as addWorktreeUtil,
  removeWorktree as removeWorktreeUtil
} from '@vibetree/core';

/**
 * Service for handling git operations on the server.
 * Executes git commands and parses their output using shared utilities.
 */
export class GitService {
  async listWorktrees(projectPath: string): Promise<Worktree[]> {
    return listWorktreesUtil(projectPath);
  }

  async getStatus(worktreePath: string): Promise<GitStatus[]> {
    return getGitStatusUtil(worktreePath);
  }

  async getDiff(worktreePath: string, filePath?: string): Promise<string> {
    return getGitDiffUtil(worktreePath, filePath);
  }

  async getDiffStaged(worktreePath: string, filePath?: string): Promise<string> {
    return getGitDiffStagedUtil(worktreePath, filePath);
  }

  async addWorktree(projectPath: string, branchName: string): Promise<WorktreeAddResult> {
    return addWorktreeUtil(projectPath, branchName);
  }

  async removeWorktree(projectPath: string, worktreePath: string, branchName: string): Promise<WorktreeRemoveResult> {
    return removeWorktreeUtil(projectPath, worktreePath, branchName);
  }

}