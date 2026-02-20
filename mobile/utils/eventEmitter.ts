import { EventEmitter } from 'eventemitter3';

/**
 * Global event emitter for cross-component communication
 * Used for syncing UI state across different tabs/screens
 */
export const eventEmitter = new EventEmitter();

export default eventEmitter;
