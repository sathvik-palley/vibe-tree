# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - 2025-08-03

### Added
- **Worktree deletion functionality** - Added ability to delete Git worktrees directly from the UI
  - New delete button in WorktreePanel component
  - Backend IPC handler `git:worktree-remove` for removing worktrees and associated branches
  - Graceful error handling - continues operation even if branch deletion fails after successful worktree removal
  - Force removal of worktrees with `--force` flag to handle uncommitted changes
  - Automatic cleanup of associated branches using `git branch -D`

### Technical Details
- Added `git:worktree-remove` IPC handler in main process
- Updated WorktreePanel component with delete functionality
- Enhanced electron type definitions for new IPC methods
- Improved error handling with detailed warning messages for partial failures