import { AbstractLogger } from "./abstract.logger";
import type { LoggedEvent, LogLevel } from "./interfaces";

/**
 * Logger implementation that stores events in memory for later inspection.
 * This is useful for tests, debugging tools, or UIs that want to inspect logs programmatically.
 */
export class MemoryLogger extends AbstractLogger {

    public readonly events: LoggedEvent[] = [];

    private push(level: LogLevel, msg: string, ...args: unknown[]): void {
        if (!this.canLog(level)) {
            return;
        }
        this.events.push({
            timestamp: Date.now(),
            level,
            message: msg,
            args,
        });
    }

    public trace(msg: string, ...args: unknown[]): void {
        this.push('trace', msg, ...args);
    }

    public debug(msg: string, ...args: unknown[]): void {
        this.push('debug', msg, ...args);
    }

    public info(msg: string, ...args: unknown[]): void {
        this.push('info', msg, ...args);
    }

    public warn(msg: string, ...args: unknown[]): void {
        this.push('warn', msg, ...args);
    }

    public error(msg: string, ...args: unknown[]): void {
        this.push('error', msg, ...args);
    }

    public fatal(msg: string, ...args: unknown[]): void {
        this.push('fatal', msg, ...args);
    }

    public log(level: LogLevel, msg: string, ...args: unknown[]): void {
        this.push(level, msg, ...args);
    }

    public flush(): void {
        this.events.length = 0;
    }
}