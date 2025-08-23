import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

interface SessionToken {
  id: string;
  deviceId: string;
  createdAt: Date;
  expiresAt: Date;
}

interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'web' | 'mobile';
  lastSeen: Date;
}

export class AuthService {
  private sessionTokens: Map<string, SessionToken> = new Map();
  private devices: Map<string, DeviceInfo> = new Map();
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'vibetree-dev-secret-change-in-production';
    
    // Clean up expired tokens periodically
    setInterval(() => this.cleanupExpiredTokens(), 60000); // Every minute
  }

  async generateQRCode(port: number): Promise<{ qrCode: string; token: string; url: string }> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Get local IP address
    const localIP = this.getLocalIPAddress();
    const url = `ws://${localIP}:${port}/connect?token=${token}`;
    
    // Store session token
    this.sessionTokens.set(token, {
      id: token,
      deviceId: '',
      createdAt: new Date(),
      expiresAt
    });
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(url);
    
    return { qrCode, token, url };
  }

  validateToken(token: string): boolean {
    const sessionToken = this.sessionTokens.get(token);
    if (!sessionToken) {
      return false;
    }
    
    if (sessionToken.expiresAt < new Date()) {
      this.sessionTokens.delete(token);
      return false;
    }
    
    return true;
  }

  async pairDevice(token: string, deviceInfo: { name: string; type: 'web' | 'mobile' }): Promise<string> {
    if (!this.validateToken(token)) {
      throw new Error('Invalid or expired token');
    }
    
    const deviceId = uuidv4();
    const device: DeviceInfo = {
      id: deviceId,
      name: deviceInfo.name,
      type: deviceInfo.type,
      lastSeen: new Date()
    };
    
    this.devices.set(deviceId, device);
    
    // Update session token with device ID
    const sessionToken = this.sessionTokens.get(token)!;
    sessionToken.deviceId = deviceId;
    
    // Generate JWT for the device
    const jwtToken = jwt.sign(
      { deviceId, type: device.type },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
    
    return jwtToken;
  }

  verifyJWT(token: string): { deviceId: string; type: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Update last seen
      const device = this.devices.get(decoded.deviceId);
      if (device) {
        device.lastSeen = new Date();
      }
      
      return { deviceId: decoded.deviceId, type: decoded.type };
    } catch {
      return null;
    }
  }

  getConnectedDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  disconnectDevice(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  private getLocalIPAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, sessionToken] of this.sessionTokens) {
      if (sessionToken.expiresAt < now) {
        this.sessionTokens.delete(token);
      }
    }
  }
}