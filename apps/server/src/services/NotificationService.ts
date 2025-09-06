import { createServer, IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';
import {
  NotificationPayload,
  NotificationManager,
  isNotificationPayload,
  ClaudeNotification
} from '@vibetree/core';

export interface NotificationServiceOptions {
  port?: number;
  host?: string;
  corsOrigins?: string[];
}

export class NotificationService extends EventEmitter {
  private server: ReturnType<typeof createServer> | null = null;
  private notificationManager: NotificationManager;
  private options: Required<NotificationServiceOptions>;

  constructor(options: NotificationServiceOptions = {}) {
    super();
    this.options = {
      port: options.port || 7878,
      host: options.host || '127.0.0.1',
      corsOrigins: options.corsOrigins || ['http://localhost:3000', 'http://127.0.0.1:3000']
    };
    
    this.notificationManager = new NotificationManager();
    
    // Forward notification manager events
    this.notificationManager.on('notification:received', (notification: ClaudeNotification) => {
      this.emit('notification', notification);
    });
    
    this.notificationManager.on('notification:broadcast', (notification: ClaudeNotification) => {
      this.emit('broadcast', notification);
    });
  }

  /**
   * Start the HTTP notification server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error: Error) => {
        console.error('Notification service error:', error);
        this.emit('error', error);
        reject(error);
      });

      this.server.listen(this.options.port, this.options.host, () => {
        console.log(`🔔 Notification service listening on ${this.options.host}:${this.options.port}`);
        this.emit('listening', { host: this.options.host, port: this.options.port });
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP notification server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        console.log('🔔 Notification service stopped');
        this.emit('stopped');
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get the notification manager instance
   */
  getNotificationManager(): NotificationManager {
    return this.notificationManager;
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Enable CORS
    this.setCorsHeaders(req, res);

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
        await this.handleStatusGet(req, res);
      } else if (method === 'GET' && url === '/notifications') {
        await this.handleNotificationsGet(req, res);
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

  /**
   * Handle POST /notification - Receive Claude notifications
   */
  private async handleNotificationPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.readRequestBody(req);
      const data = JSON.parse(body);

      if (!isNotificationPayload(data)) {
        this.sendJsonResponse(res, 400, { 
          error: 'Invalid notification payload',
          required: 'type, worktree',
          received: Object.keys(data)
        });
        return;
      }

      // Add timestamp if not provided
      if (!data.ts) {
        data.ts = Date.now();
      }

      const notification = this.notificationManager.addNotification(data as NotificationPayload);
      
      console.log(`📢 Claude notification received: ${notification.type} in ${notification.worktree}`);
      console.log(`📝 Message: "${notification.message || 'No message'}"`);
      console.log(`🆔 ID: ${notification.id}`);
      
      this.sendJsonResponse(res, 200, {
        success: true,
        notification: {
          id: notification.id,
          type: notification.type,
          worktree: notification.worktree,
          timestamp: notification.timestamp.toISOString()
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

  /**
   * Handle GET /status - Service health check
   */
  private async handleStatusGet(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const stats = this.notificationManager.getStats();
    
    this.sendJsonResponse(res, 200, {
      status: 'running',
      server: {
        host: this.options.host,
        port: this.options.port,
        uptime: process.uptime()
      },
      notifications: stats,
      subscriptions: this.notificationManager.getSubscriptions()
    });
  }

  /**
   * Handle GET /notifications - Get all notifications
   */
  private async handleNotificationsGet(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const worktree = url.searchParams.get('worktree') || undefined;
    const unreadOnly = url.searchParams.get('unread') === 'true';
    
    const notifications = unreadOnly 
      ? this.notificationManager.getUnreadNotifications(worktree)
      : this.notificationManager.getNotifications(worktree);

    this.sendJsonResponse(res, 200, {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        worktree: n.worktree,
        message: n.message,
        timestamp: n.timestamp.toISOString(),
        read: n.read
      }))
    });
  }

  /**
   * Set CORS headers for cross-origin requests
   */
  private setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
    const origin = req.headers.origin;
    
    if (origin && this.options.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', this.options.corsOrigins[0] || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  /**
   * Send JSON response
   */
  private sendJsonResponse(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Read request body as string
   */
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
      
      // Set timeout for request body
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000); // 30 seconds
    });
  }

  /**
   * Dispose of the notification service
   */
  dispose(): void {
    this.stop();
    this.notificationManager.dispose();
    this.removeAllListeners();
  }
}