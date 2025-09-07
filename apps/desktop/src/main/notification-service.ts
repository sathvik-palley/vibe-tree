import { createServer, IncomingMessage, ServerResponse } from 'http';
import { BrowserWindow } from 'electron';

interface ClaudeNotification {
  type: 'claude-finished' | 'claude-needs-input';
  worktree: string;
  message?: string;
  ts?: number;
}

export class DesktopNotificationService {
  private server: ReturnType<typeof createServer> | null = null;
  private mainWindow: BrowserWindow | null = null;
  private port = 7878;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error: Error) => {
        console.error('Desktop notification service error:', error);
        reject(error);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`🔔 Desktop notification service listening on 127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        console.log('🔔 Desktop notification service stopped');
        this.server = null;
        resolve();
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url || '';
    const method = req.method || '';

    try {
      if (method === 'POST' && url === '/notification') {
        await this.handleNotificationPost(req, res);
      } else if (method === 'GET' && url === '/status') {
        this.sendJsonResponse(res, 200, { status: 'running', service: 'desktop' });
      } else {
        this.sendJsonResponse(res, 404, { error: 'Not found' });
      }
    } catch (error) {
      console.error('Request handling error:', error);
      this.sendJsonResponse(res, 500, { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleNotificationPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.readRequestBody(req);
      const notification: ClaudeNotification = JSON.parse(body);

      if (!notification.type || !notification.worktree) {
        this.sendJsonResponse(res, 400, { 
          error: 'Invalid notification payload',
          required: ['type', 'worktree']
        });
        return;
      }

      // Add timestamp if not provided
      if (!notification.ts) {
        notification.ts = Date.now();
      }

      const notificationId = `${notification.ts}-${notification.type}-${notification.worktree}`;
      
      console.log(`📢 Claude notification received: ${notification.type} in ${notification.worktree}`);
      if (notification.message) {
        console.log(`📝 Message: "${notification.message}"`);
      }
      
      // Send to renderer process via IPC
      this.mainWindow?.webContents.send('notification:received', {
        id: notificationId,
        type: notification.type,
        worktree: notification.worktree,
        message: notification.message || 'Task completed',
        timestamp: new Date(notification.ts).toISOString()
      });
      
      this.sendJsonResponse(res, 200, {
        success: true,
        notification: {
          id: notificationId,
          type: notification.type,
          worktree: notification.worktree,
          timestamp: new Date(notification.ts).toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error processing notification:', error);
      this.sendJsonResponse(res, 400, { 
        error: 'Failed to process notification',
        message: error instanceof Error ? error.message : 'Invalid JSON or payload'
      });
    }
  }

  private sendJsonResponse(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(data, null, 2));
  }

  private readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        resolve(body);
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);
    });
  }
}