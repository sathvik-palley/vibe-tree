# Electron MCP Debugging Guide

This guide documents how to debug and interact with the VibeTree Electron application using the Electron MCP (Model Context Protocol) tools.

## Prerequisites

1. Electron MCP server must be installed and running
2. The Electron app must be started with remote debugging enabled

## Enabling Remote Debugging

Run the application with debugging enabled:

```bash
cd apps/desktop
pnpm dev:debug
```

This command is configured in `package.json` to start Electron with `--remote-debugging-port=9222`.

## Starting the Application

```bash
cd apps/desktop
pnpm dev
```

Wait for the app to fully start (approximately 8 seconds).

## Using Electron MCP Tools

### 1. Check Window Information
```javascript
mcp__electron__get_electron_window_info({ includeChildren: true })
```

This returns information about all running Electron windows, including process IDs and debugging URLs.

### 2. Take Screenshots
```javascript
mcp__electron__take_screenshot({ 
  outputPath: "/tmp/screenshot.png" 
})
```

### 3. Get Page Structure
```javascript
mcp__electron__send_command_to_electron({
  command: "get_page_structure",
  args: {}
})
```

Returns buttons, inputs, selects, and links on the current page.

### 4. Execute JavaScript
```javascript
mcp__electron__send_command_to_electron({
  command: "eval",
  args: { code: "/* your JavaScript code */" }
})
```

### 5. Click Elements
```javascript
// Click by text
mcp__electron__send_command_to_electron({
  command: "click_by_text",
  args: { text: "Button Text" }
})

// Click by selector
mcp__electron__send_command_to_electron({
  command: "click_by_selector",
  args: { selector: ".button-class" }
})
```

### 6. Send Keyboard Shortcuts
```javascript
mcp__electron__send_command_to_electron({
  command: "send_keyboard_shortcut",
  args: { text: "Meta+O" }  // Cmd+O on Mac
})
```

Common shortcuts:
- `Meta+O`: Open file/folder dialog
- `Escape`: Close dialogs
- `Enter`: Confirm actions
- `Meta+N`: New window/tab (app-specific)

### 7. Fill Forms
```javascript
mcp__electron__send_command_to_electron({
  command: "fill_input",
  args: { 
    selector: "#input-id",
    value: "text to input"
  }
})
```

### 8. Read Console Logs
```javascript
mcp__electron__read_electron_logs({
  logType: "console",
  lines: 20
})
```

## Interacting with VibeTree Application

### Understanding the IPC Bridge

The app uses `window.electronAPI` to communicate between renderer and main process:

```javascript
window.electronAPI = {
  git: { ... },        // Git operations
  shell: { ... },      // Terminal operations
  ide: { ... },        // IDE integrations
  theme: { ... },      // Theme management
  dialog: { ... },     // Native dialogs
  recentProjects: { ... }  // Project management
}
```

### Opening a Project Programmatically

#### Method 1: Using Recent Projects API
```javascript
// Add to recent projects
window.electronAPI.recentProjects.add('/path/to/project')

// Get recent projects
window.electronAPI.recentProjects.get()
```

#### Method 2: Triggering IPC Events
The app listens for `project:open` and `project:open-recent` events:

```javascript
// Simulate project open event (from renderer)
window.dispatchEvent(new CustomEvent('ipc-project:open', { 
  detail: '/path/to/project' 
}))
```

#### Method 3: Using Dialog API
```javascript
// Open native folder selector
window.electronAPI.dialog.selectDirectory()
```

### Navigating Worktrees

1. Get worktrees for a project:
```javascript
window.electronAPI.git.listWorktrees('/path/to/project')
```

2. Add a new worktree:
```javascript
window.electronAPI.git.addWorktree('/path/to/project', 'branch-name')
```

### Terminal Operations

1. Start a shell session:
```javascript
window.electronAPI.shell.start('/path/to/worktree', 80, 24)
```

2. Write to terminal:
```javascript
window.electronAPI.shell.write('processId', 'command\n')
```

3. Resize terminal:
```javascript
window.electronAPI.shell.resize('processId', cols, rows)
```

## Simulating Terminal Input

To simulate keyboard input in the terminal:

```javascript
// Method 1: Send keyboard events directly
mcp__electron__send_command_to_electron({
  command: "eval",
  args: { 
    code: `
      // Simulate typing text
      const text = 'echo test';
      for (const char of text) {
        const keyEvent = new KeyboardEvent('keydown', {
          key: char,
          code: 'Key' + char.toUpperCase(),
          charCode: char.charCodeAt(0),
          keyCode: char.charCodeAt(0),
          which: char.charCodeAt(0),
          bubbles: true
        });
        document.dispatchEvent(keyEvent);
      }
      'Sent: ' + text;
    `
  }
});

// Method 2: Send Enter key
mcp__electron__send_command_to_electron({
  command: "eval",
  args: { 
    code: `
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      document.dispatchEvent(enterEvent);
      'Enter key sent';
    `
  }
});
```

Note: This simulates keyboard events at the document level. The terminal must be focused to receive the input.

## Common Issues and Solutions

### Issue: Native File Dialog Cannot Be Controlled
**Problem**: Electron MCP cannot interact with native OS dialogs.
**Solution**: Use the IPC bridge or programmatic methods to set project paths directly.

### Issue: React State Not Accessible
**Problem**: React component state is encapsulated and not directly accessible.
**Solution**: 
1. Use React DevTools hook: `window.__REACT_DEVTOOLS_GLOBAL_HOOK__`
2. Trigger actions through DOM events
3. Use the IPC bridge to communicate with the main process

### Issue: Terminal Not Taking Full Height
**Problem**: Terminal leaves empty space at the bottom.
**Solutions**:
1. Check flex container settings
2. Verify portal rendering doesn't affect layout
3. Ensure parent containers have proper height: 100%
4. Check for conflicting CSS styles

## Useful Debug Commands

### Check React Components
```javascript
// Find React fiber root
const root = document.getElementById('root');
const fiber = root._reactRootContainer?._internalRoot?.current;
```

### Monitor IPC Messages
```javascript
// Log all IPC events (in main process)
ipcMain.on('*', (event, ...args) => {
  console.log('IPC Event:', event.channel, args);
});
```

### Inspect Terminal State
```javascript
// Get terminal dimensions
const terminal = document.querySelector('.xterm');
console.log({
  cols: terminal.terminal.cols,
  rows: terminal.terminal.rows,
  height: terminal.offsetHeight
});
```

## Tips for Effective Debugging

1. **Always wait for app to fully load** before sending commands
2. **Use screenshots** to verify UI state
3. **Check console logs** for errors or debug messages
4. **Use eval command** for custom JavaScript execution
5. **Combine multiple MCP commands** for complex interactions
6. **Monitor background processes** using BashOutput tool

## Example: Complete Project Open Flow

```javascript
// 1. Check app state
await mcp__electron__get_electron_window_info({ includeChildren: true });

// 2. Take screenshot to see current state
await mcp__electron__take_screenshot({ outputPath: "/tmp/current.png" });

// 3. Add project to recent and trigger open
await mcp__electron__send_command_to_electron({
  command: "eval",
  args: { 
    code: `
      const path = '/path/to/project';
      window.electronAPI.recentProjects.add(path).then(() => {
        window.dispatchEvent(new CustomEvent('ipc-project:open', { detail: path }));
      });
    `
  }
});

// 4. Wait for project to load
await new Promise(resolve => setTimeout(resolve, 2000));

// 5. Verify project opened
await mcp__electron__take_screenshot({ outputPath: "/tmp/after.png" });
```

## References

- [Electron Remote Debugging](https://www.electronjs.org/docs/latest/tutorial/debugging-main-process)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [React DevTools](https://react.dev/learn/react-developer-tools)