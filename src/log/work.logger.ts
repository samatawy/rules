import type { WorkingContext } from "../interfaces";
import { ConsoleLogger } from "./console.logger";
import { ContextLogger } from "./context.logger";
import { rankedLogLevels, type ILogger, type LogLevel } from "./interfaces";


/**
 * Helper class to handle and configure logging for all Rule engine classes.
 */
export class WorkLogger {

    private static logLevel: LogLevel = 'info';

    private static loggerMap: Map<string, ILogger> = new Map<string, ILogger>();

    /**
     * Globally set the logging level for all Rule engine classes.
     * @param level the level at which to start logging events.
     */
    public static setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    protected static canLog(level: LogLevel): boolean {
        const current = rankedLogLevels[this.logLevel];
        const required = rankedLogLevels[level];
        return current <= required;
    }

    protected static perform(logger: ILogger | any, func: string, msg: string, ...args: unknown[]) {
        if (logger && logger[func] && typeof logger[func] === 'function') {
            logger[func](msg, ...args);
        }
    }

    protected static performAll(func: LogLevel, msg: string, ...args: unknown[]) {
        const impl = this.getImpl() as any;
        if (impl !== WorkLogger && impl[func] && typeof impl[func] === 'function') {
            // An override implementation is set, delegate to it directly
            this.perform(impl, func, msg, ...args);
            return;
        }

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

    public static debug(msg: string, ...args: unknown[]): void {
        if (this.canLog('debug')) {
            this.performAll('debug', msg, ...args);
        }
    }

    public static info(msg: string, ...args: unknown[]): void {
        if (this.canLog('info')) {
            this.performAll('info', msg, ...args);
        }
    }

    public static warn(msg: string, ...args: unknown[]): void {
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
            case 'trace': this.trace(msg, ...args); break;
            case 'debug': this.debug(msg, ...args); break;
            case 'info': this.info(msg, ...args); break;
            case 'warn': this.warn(msg, ...args); break;
            case 'error': this.error(msg, ...args); break;
            case 'fatal': this.fatal(msg, ...args); break;
        }
    }

    public static flush(): void {
        for (const logger of this.loggerMap.values()) {
            logger.flush();
        }
    }

    /**
     * Register a new bridge to connect your preferred logging library through an ILogger implementation.
     * @param name the local identifier for the bridge.
     * @param logger an implementation of ILogger to register.
     */
    public static register(name: string, logger: ILogger): void {
        this.loggerMap.set(name, logger);
    }

    /**
     * Remove a previously connected bridge to an external logging library.
     * @param logger the identifier of the bridge (used to register).
     */
    public static unregister(logger: string | ILogger): void {
        if (typeof logger === 'string') {
            this.loggerMap.delete(logger);
        } else {
            for (const [name, value] of this.loggerMap.entries()) {
                if (value === logger) {
                    this.loggerMap.delete(name);
                    break;
                }
            }
        }
    }

    /**
     * Create a new ContextLogger for a specific working context. 
     * This allows you to log events related to that context and manage them separately from other contexts.
     * If you need a blank ContextLogger without any pre-registered loggers, you can create one directly using `new ContextLogger(context)`.
     * 
     * @param context the working context to associate with the new ContextLogger.
     * @returns a new ContextLogger instance, using the same global loggers as WorkLogger.
     */
    public static forContext(context: WorkingContext): ContextLogger {
        const contextLogger = new ContextLogger(context);
        contextLogger.setLogLevel(this.logLevel);
        for (const [name, logger] of this.loggerMap.entries()) {
            contextLogger.register(name, logger);
        }
        return contextLogger;
    }

    private static override?: ILogger;

    public static overrideWith(logger: ILogger): void {
        this.override = logger;
    }

    public static resetOverride(): void {
        this.override = undefined;
    }

    private static getImpl(): ILogger {
        return this.override ?? this;
    }
}

export function withLogger<T extends (...args: any[]) => any>(logger: ILogger, fn: T): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>) => {
        WorkLogger.overrideWith(logger);
        try {
            return fn(...args);
        } finally {
            WorkLogger.resetOverride(); // Clear the override after the function execution
        }
    };
}
