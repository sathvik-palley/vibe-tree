import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
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
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true';
const AUTH_USERNAME = process.env.USERNAME;
const AUTH_PASSWORD = process.env.PASSWORD;

// Function to check if port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Function to find an available port with simple retry logic
async function findAvailablePort(): Promise<number> {
  if (process.env.PORT) {
    return parseInt(process.env.PORT);
  }
  
  // Start with a random port in 3xxx range and try sequential ports
  let port = Math.floor(Math.random() * 1000) + 3000;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++; // Try next port
  }
  
  // If all 3 attempts fail, let the server fail with a clear error
  throw new Error(`Could not find available port after 3 attempts starting from ${port - 3}`);
}

async function startServer() {
  const app = express();
  const PORT = await findAvailablePort();
  const HOST = process.env.HOST || '0.0.0.0';
  const PROJECT_PATH = process.env.PROJECT_PATH || process.cwd();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Create HTTP server
  const server = http.createServer(app);

  // In-memory session store (in production, use Redis or database)
  const sessions = new Set<string>();

  // Configuration endpoint for web app
  app.get('/api/config', (req, res) => {
    res.json({
      authRequired: AUTH_REQUIRED,
      // Don't expose actual credentials, just indicate if they're configured
      authConfigured: !!(AUTH_USERNAME && AUTH_PASSWORD)
    });
  });

  // Setup REST routes
  setupRestRoutes(app, { shellManager, authService, requireAuth });

  // Setup WebSocket handlers
  setupWebSocketHandlers(wss, { shellManager, authService, sessions, authRequired: AUTH_REQUIRED });

  // Generate session token
  function generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  // Skip auth if not required
  if (!AUTH_REQUIRED) {
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  req.sessionToken = token;
  next();
}

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Check if auth is required
  if (!AUTH_REQUIRED) {
    return res.json({ 
      success: true, 
      message: 'Authentication not required',
      token: 'no-auth-required'
    });
  }

  // Validate credentials are configured
  if (!AUTH_USERNAME || !AUTH_PASSWORD) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server authentication not properly configured' 
    });
  }

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }

  // Check credentials
  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    const token = generateSessionToken();
    sessions.add(token);
    
    res.json({ 
      success: true, 
      message: 'Authentication successful',
      token 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password' 
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

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

  // Root endpoint - provide server info
  app.get('/', (req, res) => {
    res.json({
      name: 'VibeTree Socket Server',
      version: '0.0.1',
      endpoints: {
        websocket: `ws://${req.headers.host}`,
        health: '/health',
        config: '/api/config',
        api: '/api/*'
      },
      webApp: {
        url: 'http://localhost:3000',
        note: 'Run "pnpm dev:web" to start the web interface'
      }
    });
  });

  // Start server
  server.listen(parseInt(PORT.toString()), HOST, async () => {
    const socketUrls = getNetworkUrls(PORT, HOST);
    
    // Try to read web port from file, fallback to 3000
    let webPort = 3000;
    try {
      const webPortFile = path.join(__dirname, '../../../apps/web/.web-port');
      if (fs.existsSync(webPortFile)) {
        webPort = parseInt(fs.readFileSync(webPortFile, 'utf8').trim());
      }
    } catch (error) {
      console.warn('Could not read web port file, using default port 3000');
    }
    
    const webUrls = getNetworkUrls(webPort, HOST);
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║               VibeTree Services Started                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📁 Project Path:', PROJECT_PATH);
    console.log();
    
    console.log('🌐 Web Application (UI):');
    console.log(`   Local:   ${webUrls.local}`);
    console.log(`   Network: ${webUrls.network}`);
    console.log();
    
    console.log('🔌 Socket Server (API/WebSocket):');
    console.log(`   Local:   ${socketUrls.local}`);
    console.log(`   Network: ${socketUrls.network}`);
    console.log(`   WS:      ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log();
    
    // Generate QR code for mobile access to web app
    if (HOST === '0.0.0.0' || !HOST) {
      try {
        const qr = await qrcode.toString(webUrls.network, { type: 'terminal', small: true });
        console.log('📱 Scan QR code to access Web UI from mobile:\n');
        console.log(qr);
        console.log(`   ${webUrls.network}`);
        console.log();
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    }
    
    console.log('ℹ️  Make sure the web app is running: pnpm dev:web');
    console.log('Press Ctrl+C to stop the server\n');
  });
}

// Start the server
startServer().catch(console.error);