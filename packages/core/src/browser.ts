// Browser-safe exports only (no Node.js dependencies)

// Export all types (types are safe for browser)
export * from './types';

// Export adapter interfaces (these are just interfaces/classes with no Node.js deps)
export { CommunicationAdapter, BaseAdapter } from './adapters/CommunicationAdapter';

// Export notifications (browser-safe only)
export * from './notifications/browser';

// Export the IPty interface type only (no node-pty implementation)
export type { IPty } from './utils/shell';

// Version info
export const VERSION = '0.0.1';