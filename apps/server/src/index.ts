import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import http from 'http';
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

// Start server
server.listen(parseInt(PORT.toString()), HOST, async () => {
  const urls = getNetworkUrls(PORT, HOST);
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  VibeTree Server Started                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`📁 Project Path: ${PROJECT_PATH}`);
  console.log(`🌐 Local:        ${urls.local}`);
  console.log(`📱 Network:      ${urls.network}`);
  console.log(`🔌 WebSocket:    ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\n`);
  
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