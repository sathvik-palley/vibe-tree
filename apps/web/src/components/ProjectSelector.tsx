import { useState, useEffect } from 'react';
import { FolderOpen, Plus, AlertCircle, Info } from 'lucide-react';
import { isAutoLoadEnabled, getAutoLoadConfig, validateAutoLoadConfig } from '../utils/autoLoad';

interface ProjectSelectorProps {
  onSelectProject: (path: string) => void;
}

export function ProjectSelector({ onSelectProject }: ProjectSelectorProps) {
  const [projectPath, setProjectPath] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configWarnings, setConfigWarnings] = useState<string[]>([]);

  useEffect(() => {
    // Check for auto-load configuration warnings
    if (isAutoLoadEnabled()) {
      const warnings = validateAutoLoadConfig();
      setConfigWarnings(warnings);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectPath.trim()) {
      setError('Please enter a project path');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      onSelectProject(projectPath.trim());
    } catch (err) {
      setError('Failed to add project. Please check the path.');
    } finally {
      setIsLoading(false);
    }
  };

  const autoLoadConfig = isAutoLoadEnabled() ? getAutoLoadConfig() : null;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Select a Project</h2>
          <p className="text-muted-foreground">
            Enter the path to your git repository to start working with Claude in parallel worktrees
          </p>
        </div>

        {/* Auto-load configuration info */}
        {autoLoadConfig && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Auto-load Configuration</span>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong>Projects:</strong> {autoLoadConfig.projectPaths.join(', ')}
              </p>
              {autoLoadConfig.defaultProject && (
                <p>
                  <strong>Default:</strong> {autoLoadConfig.defaultProject}
                </p>
              )}
            </div>
            
            {configWarnings.length > 0 && (
              <div className="space-y-1">
                {configWarnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="projectPath" className="text-sm font-medium">
              Project Path
            </label>
            <input
              id="projectPath"
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/your/project"
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !projectPath.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isLoading ? 'Adding Project...' : 'Add Project'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Make sure the path points to a valid git repository
          </p>
        </div>
      </div>
    </div>
  );
}