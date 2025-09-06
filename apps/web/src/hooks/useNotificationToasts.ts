import { useEffect, useState } from 'react';
import { ClaudeNotification } from '@vibetree/core/notifications/types';

// Sound utilities
function playNotificationSound(type: 'claude-finished' | 'claude-needs-input') {
  try {
    // Create audio context for better browser support
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Simple beep sound using Web Audio API
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different notification types
    if (type === 'claude-finished') {
      // Success sound - pleasant higher tone
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    } else {
      // Alert sound - attention-grabbing
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    }
    
    // Set volume and duration
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    console.log(`🔊 Playing ${type} notification sound`);
  } catch (error) {
    console.log('Could not play notification sound:', error);
    
    // Fallback: try simple audio element
    try {
      const audio = new Audio();
      // Simple data URL for a short beep
      audio.src = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAQABACYAAAAAAAAAAAEACAAZGF0YQ4AAACAAACAAACAAACAAACAAAAAAAAAAAAAAAAAAAAAAA==';
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Audio element fallback also failed:', e));
    } catch (fallbackError) {
      console.log('All audio methods failed:', fallbackError);
    }
  }
}

interface NotificationToast {
  id: string;
  type: 'claude-finished' | 'claude-needs-input';
  message: string;
  worktree: string;
  timestamp: Date;
  visible: boolean;
}

export function useNotificationToasts(connected: boolean) {
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!connected) return;

    // Simple WebSocket connection for notifications only
    const websocket = new WebSocket('ws://localhost:3002');
    
    websocket.onopen = () => {
      console.log('🔔 Toast notification WebSocket connected');
      // Subscribe to notifications
      websocket.send(JSON.stringify({
        type: 'notification:subscribe',
        payload: {}
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'notification:broadcast' && message.payload) {
          const notification = message.payload as ClaudeNotification;
          
          // Create toast
          const toast: NotificationToast = {
            id: notification.id,
            type: notification.type,
            message: notification.message || `Claude ${notification.type.replace('claude-', '')} in worktree`,
            worktree: notification.worktree,
            timestamp: new Date(notification.timestamp),
            visible: true
          };

          setToasts(prev => [...prev, toast]);

          // Play notification sound
          playNotificationSound(notification.type);

          // Auto-hide after 5 seconds
          setTimeout(() => {
            setToasts(prev => prev.map(t => 
              t.id === toast.id ? { ...t, visible: false } : t
            ));
            
            // Remove after fade out
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 300);
          }, 5000);
        }
      } catch (error) {
        console.error('Failed to parse notification message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('🔔 Toast notification WebSocket disconnected');
    };

    websocket.onerror = (error) => {
      console.error('🔔 Toast notification WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
      setWs(null);
    };
  }, [connected]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.map(t => 
      t.id === id ? { ...t, visible: false } : t
    ));
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  return { toasts, dismissToast };
}