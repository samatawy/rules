import { AbstractLogger } from "./abstract.logger";
import type { LogLevel } from "./interfaces";

/**
 * A simple implementation of WorkLogger that outputs to the console.
 * Write a class similar to this one to connect your preferred logging library, Pino, Winston, Sentry, etc.
 */
export class ConsoleLogger extends AbstractLogger {

    public trace(msg: string, ...args: unknown[]): void {
        console.trace(msg, ...args);
    }

    public debug(msg: string, ...args: any[]): void {
        console.debug(msg, ...args);
    }

    public info(msg: string, ...args: unknown[]): void {
        console.info(msg, ...args);
    }

    public warn(msg: string, ...args: any[]): void {
        console.warn(msg, ...args);
    }

    public error(msg: string, ...args: unknown[]): void {
        console.error(msg, ...args);
    }

    public fatal(msg: string, ...args: unknown[]): void {
        console.error(msg, ...args);
    }

    public log(level: LogLevel, msg: string, ...args: unknown[]): void {
        switch (level) {
            case 'trace': this.trace(msg, args); break;
            case 'debug': this.debug(msg, args); break;
            case 'info': this.info(msg, args); break;
            case 'warn': this.warn(msg, args); break;
            case 'error': this.error(msg, args); break;
            case 'fatal': this.fatal(msg, args); break;
        }
    }

    public flush(): void {
        // No buffering, so nothing to flush
    }
}