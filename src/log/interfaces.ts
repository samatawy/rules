export const rankedLogLevels: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * A common interface for logging classes that can write logs to any destination.
 * Implement this interface to create a bridge to your preferred logging library: Pino, Windston, Sentry, etc. 
 */
export interface ILogger {

    trace(msg: string, ...args: unknown[]): void;

    debug(msg: string, ...args: unknown[]): void;

    info(msg: string, ...args: unknown[]): void;

    warn(msg: string, ...args: unknown[]): void;

    error(msg: string, ...args: unknown[]): void;

    fatal(msg: string, ...args: unknown[]): void;

    log(level: LogLevel, msg: string, ...args: unknown[]): void;

    /**
     * In case your logger buffers logs, flush should be called at the end of execution to ensure all logs are written out.
     * If your logger does not buffer logs, you can leave this method empty.
     */
    flush(): void;
}
