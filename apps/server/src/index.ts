import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { setupWebSocketHandlers } from './api/websocket';
import { setupRestRoutes } from './api/rest';
import { ShellManager } from './services/ShellManager';
import { GitService } from './services/GitService';
import { AuthService } from './auth/AuthService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Initialize services
const shellManager = new ShellManager();
const gitService = new GitService();
const authService = new AuthService();

// Setup REST routes
setupRestRoutes(app, { shellManager, gitService, authService });

// Setup WebSocket handlers
setupWebSocketHandlers(wss, { shellManager, gitService, authService });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.0.1' });
});

// Start server
server.listen(PORT, () => {
  console.log(`VibeTree Server running on port ${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
});