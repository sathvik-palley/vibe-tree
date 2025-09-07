import { useEffect } from 'react';

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
  }
}

export function useSystemNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    console.log('🔔 Setting up desktop notification listener via IPC');

    // Listen for notifications from main process via IPC
    const unsubscribe = window.electronAPI.notification.onReceived((notification) => {
      console.log('🔔 Received notification from main process:', notification);
      
      // Show system notification with better formatting
      const title = notification.type === 'claude-finished' ? 'Claude Finished' : 'Claude Needs Input';
      const pathParts = notification.worktree.split('/');
      const projectName = pathParts[pathParts.length - 2] || 'Unknown Project';
      const branchOrWorktree = pathParts[pathParts.length - 1] || 'main';
      
      // If it's the main repo, show just project name, otherwise show project + branch
      const displayName = branchOrWorktree === projectName ? projectName : `${projectName}/${branchOrWorktree}`;
      const body = notification.message || `Task completed in ${displayName}`;
      
      window.electronAPI.notification.show({
        title: `${title} - ${displayName}`,
        body,
        type: notification.type
      });

      // Play custom notification sound
      playNotificationSound(notification.type);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [enabled]);
}