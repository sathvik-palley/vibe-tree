// Export all types
export * from './types';

// Export adapter interfaces
export { CommunicationAdapter, BaseAdapter } from './adapters/CommunicationAdapter';

// Export utilities
export * from './utils/git-parser';
export * from './utils/shell';
export * from './utils/git';

// Version info
export const VERSION = '0.0.1';