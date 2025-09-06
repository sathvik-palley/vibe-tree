// WebSocket event constants for Claude notifications
export const EVENT_NOTIFICATION = 'notification:claude';

// Notification-specific WebSocket message types
export const NOTIFICATION_EVENTS = {
  // Server to client events
  NOTIFICATION_RECEIVED: 'notification:received',
  NOTIFICATION_BROADCAST: 'notification:broadcast',
  
  // Client to server events  
  NOTIFICATION_SUBSCRIBE: 'notification:subscribe',
  NOTIFICATION_UNSUBSCRIBE: 'notification:unsubscribe',
  NOTIFICATION_MARK_READ: 'notification:mark-read',
  NOTIFICATION_CLEAR_ALL: 'notification:clear-all',
  
  // Status events
  NOTIFICATION_STATUS: 'notification:status'
} as const;

export type NotificationEventType = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];

// WebSocket message structure for notifications
export interface NotificationWebSocketMessage {
  type: NotificationEventType;
  payload: any;
  id?: string;
  timestamp?: number;
}

// Specific message payload types
export interface NotificationSubscribePayload {
  worktreePaths?: string[]; // Subscribe to specific worktrees, or all if undefined
}

export interface NotificationMarkReadPayload {
  notificationId: string;
}

export interface NotificationStatusPayload {
  connected: boolean;
  subscriptions: string[];
  unreadCount: number;
}