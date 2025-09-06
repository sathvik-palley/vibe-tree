export type NotificationType = 'claude-finished' | 'claude-needs-input';

export interface NotificationPayload {
  type: NotificationType;
  worktree: string;
  message?: string;
  ts?: number;
}

export interface ClaudeNotification extends NotificationPayload {
  id: string;
  timestamp: Date;
  read: boolean;
}

export interface NotificationDisplayOptions {
  title?: string;
  description?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'secondary' | 'destructive';
  }>;
}

export function isNotificationPayload(value: unknown): value is NotificationPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.type === 'string' &&
    (obj.type === 'claude-finished' || obj.type === 'claude-needs-input') &&
    typeof obj.worktree === 'string' &&
    (obj.message === undefined || typeof obj.message === 'string') &&
    (obj.ts === undefined || typeof obj.ts === 'number')
  );
}

export function createNotification(payload: NotificationPayload): ClaudeNotification {
  return {
    ...payload,
    id: `${payload.type}-${payload.worktree}-${Date.now()}`,
    timestamp: new Date(payload.ts || Date.now()),
    read: false
  };
}

export function getNotificationDisplayText(notification: ClaudeNotification): NotificationDisplayOptions {
  const worktreeName = notification.worktree.split('/').pop() || notification.worktree;
  
  switch (notification.type) {
    case 'claude-finished':
      return {
        title: '✅ Claude Task Completed',
        description: `Task completed in ${worktreeName}${notification.message ? `: ${notification.message}` : ''}`,
        duration: 5000,
        actions: [
          {
            label: 'View Worktree',
            action: () => {
              // This will be implemented by the consuming app
            },
            variant: 'default'
          }
        ]
      };
    
    case 'claude-needs-input':
      return {
        title: '⏸️ Claude Needs Input',
        description: `Claude is waiting for input in ${worktreeName}${notification.message ? `: ${notification.message}` : ''}`,
        persistent: true,
        actions: [
          {
            label: 'Open Terminal',
            action: () => {
              // This will be implemented by the consuming app
            },
            variant: 'default'
          }
        ]
      };
    
    default:
      return {
        title: 'Claude Notification',
        description: notification.message || 'Claude has an update',
        duration: 3000
      };
  }
}