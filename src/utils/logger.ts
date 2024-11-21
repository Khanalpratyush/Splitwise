import type { _LogLevel, _LogPayload } from '@/types';

type LogFunction = (...args: unknown[]) => void;

interface Logger {
  debug: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: (message: string, error?: Error | unknown) => void;
}

const logger: Logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]) => {
    console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (message: string, error?: Error | unknown) => {
    if (error) {
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      } else {
        console.error('Error details:', error);
      }
    } else {
      console.error(message);
    }
  }
};

export default logger; 