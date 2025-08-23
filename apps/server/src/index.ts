import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import qrcode from 'qrcode';
import { setupWebSocketHandlers } from './api/websocket';
import { setupRestRoutes } from './api/rest';
import { ShellManager } from './services/ShellManager';
import { AuthService } from './auth/AuthService';
import { getNetworkUrls } from '@vibetree/core';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';
const PROJECT_PATH = process.env.PROJECT_PATH || process.cwd();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from web app dist folder (in production)
// Navigate from apps/server to apps/web/dist
const webDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  console.log(`Serving static files from: ${webDistPath}`);
}

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Initialize services
const shellManager = new ShellManager();
const authService = new AuthService();

// Setup REST routes
setupRestRoutes(app, { shellManager, authService });

// Setup WebSocket handlers
setupWebSocketHandlers(wss, { shellManager, authService });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.0.1' });
});

// Catch-all route - serve index.html for client-side routing
// This must be after all API routes
app.get('*', (req, res) => {
  const indexPath = path.join(webDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VibeTree</title>
          <style>
            body { font-family: system-ui; padding: 40px; text-align: center; }
            h1 { color: #333; }
            p { color: #666; margin: 20px 0; }
            code { background: #f4f4f4; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>VibeTree Server</h1>
          <p>Web UI not found. Please build the web app first:</p>
          <code>pnpm --filter @vibetree/web build</code>
          <p>Then restart the server.</p>
          <hr>
          <p>API endpoints are available at <code>/api/*</code></p>
          <p>WebSocket endpoint: <code>ws://${req.headers.host}</code></p>
        </body>
      </html>
    `);
  }
});

// Start server
server.listen(parseInt(PORT.toString()), HOST, async () => {
  const urls = getNetworkUrls(PORT, HOST);
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  VibeTree Server Started                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`📁 Project Path: ${PROJECT_PATH}`);
  console.log(`🌐 Local URL:    ${urls.local}`);
  console.log(`📱 Network URL:  ${urls.network}`);
  console.log(`🔌 WebSocket:    ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  
  // Check if web UI is built
  const indexPath = path.join(webDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`✅ Web UI:       Serving from ${webDistPath}`);
  } else {
    console.log(`⚠️  Web UI:       Not built (run: pnpm build:web)`);
  }
  console.log();
  
  // Generate QR code for mobile access
  if (HOST === '0.0.0.0' || !HOST) {
    try {
      const qr = await qrcode.toString(urls.network, { type: 'terminal', small: true });
      console.log('📱 Scan QR code to access from mobile:\n');
      console.log(qr);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  }
  
  console.log('Press Ctrl+C to stop the server\n');
});