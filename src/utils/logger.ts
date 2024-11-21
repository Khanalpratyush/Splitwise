import { LogLevel, LogPayload } from '@/types';

const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    console.info(...args);
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (message: string, error?: any) => {
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