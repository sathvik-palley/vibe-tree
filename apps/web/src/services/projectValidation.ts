interface ProjectValidationResult {
  path: string;
  name?: string;
  valid: boolean;
  error?: string;
}

/**
 * Validate multiple project paths using the server API
 * @param projectPaths - Array of project paths to validate
 * @returns Promise with validation results
 */
export async function validateProjectPaths(projectPaths: string[]): Promise<ProjectValidationResult[]> {
  if (projectPaths.length === 0) {
    return [];
  }

  try {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
    const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    const response = await fetch(`${httpUrl}/api/projects/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectPaths }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to validate projects:', error);
    // Return error results for all paths
    return projectPaths.map(path => ({
      path,
      valid: false,
      error: `Validation failed: ${(error as Error).message}`,
    }));
  }
}
