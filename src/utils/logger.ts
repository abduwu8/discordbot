const reset = '\x1b[0m';

const paint = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  success: '\x1b[32m',
  dim: '\x1b[90m',
} as const;

type LogLevel = 'info' | 'warn' | 'error' | 'success';

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: LogLevel, message: string): string {
  const tag = level.toUpperCase().padEnd(7, ' ');
  return `${paint.dim}${timestamp()}${reset} ${paint[level]}${tag}${reset} ${message}`;
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(format('info', message), ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    console.warn(format('warn', message), ...args);
  },
  error(message: string, ...args: unknown[]): void {
    console.error(format('error', message), ...args);
  },
  success(message: string, ...args: unknown[]): void {
    console.log(format('success', message), ...args);
  },
};
