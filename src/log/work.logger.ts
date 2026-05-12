import { ConsoleLogger } from "./console.logger";

const rankedLogLevels: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ILogger {

    trace(msg: string, ...args: unknown[]): void;

    debug(msg: string, ...args: unknown[]): void;

    info(msg: string, ...args: unknown[]): void;

    warn(msg: string, ...args: unknown[]): void;

    error(msg: string, ...args: unknown[]): void;

    fatal(msg: string, ...args: unknown[]): void;

    log(level: LogLevel, msg: string, ...args: unknown[]): void;
}

export class WorkLogger {

    private static logLevel: LogLevel = 'info';

    private static loggerMap: Map<string, ILogger> = new Map<string, ILogger>();

    public static setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    public static canLog(level: LogLevel): boolean {
        const current = rankedLogLevels[this.logLevel];
        const required = rankedLogLevels[level];
        return current <= required;
    }

    protected static perform(logger: ILogger | any, func: string, msg: string, ...args: unknown[]) {
        if (logger && logger[func] && typeof logger[func] === 'function') {
            logger[func](msg, ...args);
        }
    }

    protected static performAll(func: string, msg: string, ...args: unknown[]) {
        if (this.loggerMap.size === 0) {
            this.loggerMap.set('console', new ConsoleLogger());
        }
        for (const logger of this.loggerMap.values()) {
            this.perform(logger, func, msg, ...args);
        }
    }

    public static trace(msg: string, ...args: unknown[]): void {
        if (this.canLog('trace')) {
            this.performAll('trace', msg, ...args);
        }
    }

    public static debug(msg: string, ...args: any[]): void {
        if (this.canLog('debug')) {
            this.performAll('debug', msg, ...args);
        }
    }

    public static info(msg: string, ...args: unknown[]): void {
        if (this.canLog('info')) {
            this.performAll('info', msg, ...args);
        }
    }

    public static warn(msg: string, ...args: any[]): void {
        if (this.canLog('warn')) {
            this.performAll('warn', msg, ...args);
        }
    }

    public static error(msg: string, ...args: unknown[]): void {
        if (this.canLog('error')) {
            this.performAll('error', msg, ...args);
        }
    }

    public static fatal(msg: string, ...args: unknown[]): void {
        if (this.canLog('fatal')) {
            this.performAll('fatal', msg, ...args);
        }
    }

    public static log(level: LogLevel, msg: string, ...args: unknown[]): void {
        switch (level) {
            case 'trace': this.trace(msg, args); break;
            case 'debug': this.debug(msg, args); break;
            case 'info': this.info(msg, args); break;
            case 'warn': this.warn(msg, args); break;
            case 'error': this.error(msg, args); break;
            case 'fatal': this.fatal(msg, args); break;
        }
    }

    public static register(name: string, logger: ILogger): void {
        this.loggerMap.set(name, logger);
    }

    public static unregister(logger: string | ILogger): void {
        if (typeof logger === 'string') {
            this.loggerMap.delete(logger);
        } else {
            this.loggerMap.values()
        }
    }
}
