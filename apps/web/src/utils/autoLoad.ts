/**
 * Parse the VITE_AUTO_LOAD_PROJECTS environment variable
 * @returns Array of project paths
 */
export function parseAutoLoadProjects(): string[] {
  const autoLoadProjects = import.meta.env.VITE_AUTO_LOAD_PROJECTS;
  if (!autoLoadProjects || autoLoadProjects.trim() === '') {
    return [];
  }
  
  return autoLoadProjects
    .split(',')
    .map(path => path.trim())
    .filter(path => path.length > 0);
}

/**
 * Get the default project path from environment
 * @returns Default project path or null
 */
export function getDefaultProject(): string | null {
  const defaultProject = import.meta.env.VITE_DEFAULT_PROJECT;
  return defaultProject && defaultProject.trim() !== '' ? defaultProject.trim() : null;
}

/**
 * Get auto-load configuration
 * @returns Configuration object with project paths and default project
 */
export function getAutoLoadConfig() {
  const projectPaths = parseAutoLoadProjects();
  const defaultProject = getDefaultProject();
  
  return {
    projectPaths,
    defaultProject
  };
}

/**
 * Check if auto-loading is configured
 * @returns True if auto-load projects are configured
 */
export function isAutoLoadEnabled(): boolean {
  return getAutoLoadConfig().projectPaths.length > 0;
}

/**
 * Validate auto-load configuration for common issues
 * @returns Array of validation warnings/errors
 */
export function validateAutoLoadConfig(): string[] {
  const warnings: string[] = [];
  const config = getAutoLoadConfig();
  
  if (config.projectPaths.length === 0) {
    return warnings; // No config, no warnings
  }
  
  // Check for duplicate paths
  const uniquePaths = new Set(config.projectPaths);
  if (uniquePaths.size !== config.projectPaths.length) {
    warnings.push('Duplicate project paths found in VITE_AUTO_LOAD_PROJECTS');
  }
  
  // Check if default project is in the list
  if (config.defaultProject && !config.projectPaths.includes(config.defaultProject)) {
    warnings.push('VITE_DEFAULT_PROJECT is not in the VITE_AUTO_LOAD_PROJECTS list');
  }
  
  // Check for too many projects (performance warning)
  if (config.projectPaths.length > 5) {
    warnings.push('Loading more than 5 projects may impact startup performance');
  }
  
  // Check for obviously invalid paths
  const suspiciousPaths = config.projectPaths.filter(path => {
    return path.length < 2 || path.includes(' ') && !path.includes('/');
  });
  
  if (suspiciousPaths.length > 0) {
    warnings.push(`Potentially invalid paths: ${suspiciousPaths.join(', ')}`);
  }
  
  return warnings;
}
