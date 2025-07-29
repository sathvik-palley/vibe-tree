<div align="center">
  <img src="assets/icons/VibeTree.png" alt="VibeTree Logo" width="128" height="128">
  
  # VibeTree
  
  **Vibe code with AI in parallel git worktrees**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Electron](https://img.shields.io/badge/Electron-28.1.3-47848F?logo=electron)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
</div>

---

VibeTree is a desktop application that enhances your development workflow by enabling parallel development with AI assistance across multiple git worktrees. Work on features simultaneously without context switching.

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package the app
npm run package
```

## ✨ Features

### 🌳 Git Worktree Management
- **Parallel Development** - Work on multiple features simultaneously without stashing or switching branches
- **Quick Branch Creation** - Create new feature branches as isolated worktrees with a single click
- **Visual Worktree Overview** - See all your worktrees at a glance with branch names and paths

### 💻 Integrated Terminal
- **Persistent Sessions** - Each worktree maintains its own terminal session
- **State Preservation** - Terminal history and output preserved when switching between worktrees
- **Full PTY Support** - Powered by node-pty for proper terminal emulation
- **Claude CLI Integration** - Seamlessly work with Claude in each terminal

### 🎨 Modern UI/UX
- **Monochrome Design** - Clean, distraction-free interface
- **Dark/Light Mode** - Automatic OS theme detection with manual toggle
- **Multi-Project Tabs** - Work with multiple repositories in tabbed interface
- **Responsive Layout** - Optimized for productivity with resizable panels

### 🔧 Developer Experience
- **IDE Integration** - Quick open in VS Code or Cursor from any worktree
- **One-Click IDE Launch** - Open any worktree directly in your preferred IDE
- **macOS Native** - Proper traffic light window controls integration
- **Fast & Lightweight** - Built with Electron + Vite for optimal performance

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron** | Cross-platform desktop framework |
| **React** | UI framework |
| **TypeScript** | Type safety and better DX |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Beautiful, accessible components |
| **Radix UI** | Unstyled, accessible primitives |
| **xterm.js** | Terminal emulation |
| **node-pty** | Pseudo-terminal support |
| **Vite** | Fast build tooling |

## 📦 Project Structure

```
vibetree/
├── src/
│   ├── main/          # Electron main process
│   ├── preload/       # Preload scripts
│   └── renderer/      # React application
│       ├── components/
│       ├── contexts/
│       └── styles/
├── assets/            # Icons and images
└── dist/              # Build output
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the LICENSE file for details.