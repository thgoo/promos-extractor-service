import type { Logger } from './types';

export class ConsoleLogger implements Logger {
  private readonly isDevelopment: boolean;

  private static readonly LEVEL_STYLES: Partial<Record<string, readonly [icon: string, color: string]>> = {
    info:  ['[INFO]',  '\x1b[36m'],
    warn:  ['[WARN]',  '\x1b[33m'],
    error: ['[ERROR]', '\x1b[31m'],
    debug: ['[DEBUG]', '\x1b[90m'],
  };

  constructor() {
    this.isDevelopment = process.env['NODE_ENV'] !== 'production';
  }

  private shouldLog(): boolean {
    return process.env['NODE_ENV'] !== 'test';
  }

  private formatMeta(meta?: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) return '';

    const entries = Object.entries(meta)
      .map(([key, value]) => {
        const formatted = typeof value === 'string' ? value : JSON.stringify(value);
        return `\x1b[90m${key}=\x1b[0m${formatted}`;
      })
      .join(' ');

    return ` ${entries}`;
  }

  private log(level: string, message: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog()) return;

    const now = new Date();
    // eslint-disable-next-line no-console
    const output = level === 'error' ? console.error : console.log;

    if (!this.isDevelopment) {
      output(JSON.stringify({ level, message, timestamp: now.toISOString(), ...meta }));
      return;
    }

    const [icon, color] = ConsoleLogger.LEVEL_STYLES[level] ?? ['[LOG]', '\x1b[0m'];
    const reset = '\x1b[0m';
    const gray = '\x1b[90m';
    const time = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });

    output(`${gray}${time}${reset} ${color}${icon} ${message}${reset}${this.formatMeta(meta)}`);
  }

  info(message: string, meta?: Record<string, unknown>) { this.log('info', message, meta); }
  warn(message: string, meta?: Record<string, unknown>) { this.log('warn', message, meta); }
  error(message: string, meta?: Record<string, unknown>) { this.log('error', message, meta); }
  debug(message: string, meta?: Record<string, unknown>) { this.log('debug', message, meta); }
}
