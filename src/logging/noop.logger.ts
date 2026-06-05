import { AbstractLogger } from "./abstract.logger";
import type { LogLevel } from "./interfaces";

/**
 * Logger implementation that intentionally discards all log events.
 * This is useful when callers want to silence logging explicitly.
 */
export class NoopLogger extends AbstractLogger {

    public trace(msg: string, ...args: unknown[]): void {
        void msg;
        void args;
    }

    public debug(msg: string, ...args: unknown[]): void {
        void msg;
        void args;
    }

    public info(msg: string, ...args: unknown[]): void {
        void msg;
        void args;
    }

    public warn(msg: string, ...args: unknown[]): void {
        void msg;
        void args;
    }

    public error(msg: string, ...args: unknown[]): void {
        void msg;
        void args;
    }

    public fatal(msg: string, ...args: unknown[]): void {
        void msg;
        void args;
    }

    public log(level: LogLevel, msg: string, ...args: unknown[]): void {
        void level;
        void msg;
        void args;
    }

    public flush(): void {
        // Intentionally empty.
    }
}

export const noopLogger = new NoopLogger();
