import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const contextStorage = new AsyncLocalStorage<Map<string, string>>();

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = new Proxy(baseLogger, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);
    if (['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(prop as string)) {
      return (...args: unknown[]) => { 
        const store = contextStorage.getStore();
        const correlationId = store?.get('correlationId') || 'none';
        
        const updatedArgs = [...args];
        const firstArg = updatedArgs[0];
        if (typeof firstArg === 'object' && firstArg !== null && !Array.isArray(firstArg)) {
          updatedArgs[0] = { correlationId, ...firstArg };
        } else {
          updatedArgs.unshift({ correlationId });
        }
        return (original as (...anyArgs: unknown[]) => unknown).apply(target, updatedArgs);
      };
    }
    return original;
  }
});
