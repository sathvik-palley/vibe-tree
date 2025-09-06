import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Volume2 } from 'lucide-react';

interface NotificationToast {
  id: string;
  type: 'claude-finished' | 'claude-needs-input';
  message: string;
  worktree: string;
  timestamp: Date;
  visible: boolean;
}

interface NotificationToastsProps {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
}

export function NotificationToasts({ toasts, onDismiss }: NotificationToastsProps) {
  const [audioTestVisible, setAudioTestVisible] = useState(false);

  const testAudio = () => {
    try {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAQABACYAAAAAAAAAAAEACAAZGF0YQ4AAACAAACAAACAAACAAACAAAAAAAAAAAAAAAAAAAAAAA==';
      audio.volume = 0.3;
      audio.play().then(() => {
        console.log('🔊 Audio test successful - notifications will now have sound');
        setAudioTestVisible(false);
      }).catch(e => {
        console.log('Audio test failed:', e);
      });
    } catch (error) {
      console.log('Audio test error:', error);
    }
  };

  if (toasts.length === 0 && !audioTestVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            transform transition-all duration-300 ease-in-out max-w-sm
            ${toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          `}
        >
          <div className={`
            rounded-lg border shadow-lg p-4 flex items-start gap-3
            ${toast.type === 'claude-finished' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }
          `}>
            {toast.type === 'claude-finished' ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                toast.type === 'claude-finished'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {toast.type === 'claude-finished' ? 'Claude Finished' : 'Claude Needs Input'}
              </p>
              <p className={`text-sm mt-1 ${
                toast.type === 'claude-finished'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                {toast.message}
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                {toast.worktree.split('/').pop()}
              </p>
            </div>
            
            <button
              onClick={() => onDismiss(toast.id)}
              className={`
                p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors
                ${toast.type === 'claude-finished'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'
                }
              `}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      
      {/* Audio Test Button - Shows on first visit or when no notifications */}
      {toasts.length === 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => {
              testAudio();
              setAudioTestVisible(true);
            }}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg transition-colors text-sm"
            title="Test notification sound (enables audio permissions)"
          >
            <Volume2 className="h-4 w-4" />
            Test Sound
          </button>
        </div>
      )}
    </div>
  );
}