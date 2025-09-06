import { EventEmitter } from 'events';
import {
  NotificationPayload,
  ClaudeNotification,
  createNotification,
  isNotificationPayload,
  NotificationDisplayOptions,
  getNotificationDisplayText
} from './types';
import { NOTIFICATION_EVENTS } from './events';

export interface NotificationManagerOptions {
  maxNotifications?: number;
  autoMarkReadDelay?: number;
}

export class NotificationManager extends EventEmitter {
  private notifications: Map<string, ClaudeNotification> = new Map();
  private subscriptions: Set<string> = new Set();
  private options: Required<NotificationManagerOptions>;

  constructor(options: NotificationManagerOptions = {}) {
    super();
    this.options = {
      maxNotifications: options.maxNotifications || 100,
      autoMarkReadDelay: options.autoMarkReadDelay || 30000 // 30 seconds
    };
  }

  /**
   * Add a new notification from Claude
   */
  addNotification(payload: NotificationPayload): ClaudeNotification {
    if (!isNotificationPayload(payload)) {
      throw new Error('Invalid notification payload');
    }

    const notification = createNotification(payload);
    
    // Add to storage
    this.notifications.set(notification.id, notification);
    
    // Cleanup old notifications if we exceed the limit
    this.cleanupOldNotifications();
    
    // Emit events
    this.emit(NOTIFICATION_EVENTS.NOTIFICATION_RECEIVED, notification);
    this.emit(NOTIFICATION_EVENTS.NOTIFICATION_BROADCAST, notification);
    
    // Auto-mark as read after delay for non-persistent notifications
    const displayOptions = getNotificationDisplayText(notification);
    if (!displayOptions.persistent && this.options.autoMarkReadDelay > 0) {
      setTimeout(() => {
        this.markAsRead(notification.id);
      }, this.options.autoMarkReadDelay);
    }
    
    return notification;
  }

  /**
   * Get all notifications, optionally filtered by worktree
   */
  getNotifications(worktreePath?: string): ClaudeNotification[] {
    let notifications = Array.from(this.notifications.values());
    
    if (worktreePath) {
      notifications = notifications.filter(n => n.worktree === worktreePath);
    }
    
    return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(worktreePath?: string): ClaudeNotification[] {
    return this.getNotifications(worktreePath).filter(n => !n.read);
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): ClaudeNotification | undefined {
    return this.notifications.get(id);
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification || notification.read) {
      return false;
    }

    notification.read = true;
    this.notifications.set(id, notification);
    this.emit('notification:read', notification);
    
    return true;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(worktreePath?: string): number {
    let count = 0;
    const notifications = worktreePath 
      ? this.getNotifications(worktreePath)
      : Array.from(this.notifications.values());

    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true;
        this.notifications.set(notification.id, notification);
        count++;
      }
    }

    if (count > 0) {
      this.emit('notification:bulk-read', { count, worktreePath });
    }

    return count;
  }

  /**
   * Remove notification
   */
  removeNotification(id: string): boolean {
    const removed = this.notifications.delete(id);
    if (removed) {
      this.emit('notification:removed', id);
    }
    return removed;
  }

  /**
   * Clear all notifications
   */
  clearAll(worktreePath?: string): number {
    let count = 0;
    
    if (worktreePath) {
      for (const [id, notification] of this.notifications.entries()) {
        if (notification.worktree === worktreePath) {
          this.notifications.delete(id);
          count++;
        }
      }
    } else {
      count = this.notifications.size;
      this.notifications.clear();
    }

    if (count > 0) {
      this.emit('notification:cleared', { count, worktreePath });
    }

    return count;
  }

  /**
   * Subscribe to notifications for specific worktrees
   */
  subscribe(worktreePaths: string[] = []): void {
    if (worktreePaths.length === 0) {
      // Subscribe to all
      this.subscriptions.clear();
      this.subscriptions.add('*');
    } else {
      // Subscribe to specific worktrees
      this.subscriptions.delete('*');
      worktreePaths.forEach(path => this.subscriptions.add(path));
    }
    
    this.emit('subscription:changed', Array.from(this.subscriptions));
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribe(worktreePaths?: string[]): void {
    if (!worktreePaths || worktreePaths.length === 0) {
      // Unsubscribe from all
      this.subscriptions.clear();
    } else {
      // Unsubscribe from specific worktrees
      worktreePaths.forEach(path => this.subscriptions.delete(path));
    }
    
    this.emit('subscription:changed', Array.from(this.subscriptions));
  }

  /**
   * Check if subscribed to notifications for a worktree
   */
  isSubscribed(worktreePath: string): boolean {
    return this.subscriptions.has('*') || this.subscriptions.has(worktreePath);
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Get notification statistics
   */
  getStats(): {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byWorktree: Record<string, number>;
  } {
    const notifications = Array.from(this.notifications.values());
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {} as Record<string, number>,
      byWorktree: {} as Record<string, number>
    };

    for (const notification of notifications) {
      // Count by type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      
      // Count by worktree
      const worktreeName = notification.worktree.split('/').pop() || notification.worktree;
      stats.byWorktree[worktreeName] = (stats.byWorktree[worktreeName] || 0) + 1;
    }

    return stats;
  }

  /**
   * Cleanup old notifications based on max limit
   */
  private cleanupOldNotifications(): void {
    if (this.notifications.size <= this.options.maxNotifications) {
      return;
    }

    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const toRemove = notifications.slice(0, notifications.length - this.options.maxNotifications);
    
    for (const notification of toRemove) {
      this.notifications.delete(notification.id);
    }

    if (toRemove.length > 0) {
      this.emit('notification:cleanup', { removed: toRemove.length });
    }
  }

  /**
   * Dispose of the notification manager
   */
  dispose(): void {
    this.notifications.clear();
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}