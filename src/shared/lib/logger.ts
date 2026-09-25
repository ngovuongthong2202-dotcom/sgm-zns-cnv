const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

export const logger = {
  info: (...args: any[]) => { if (isDev) console.info(...args); },
  warn: (...args: any[]) => { if (isDev) console.warn(...args); },
  error: (...args: any[]) => { console.error(...args); },
  debug: (...args: any[]) => { if (isDev) console.debug(...args); },
};

