import { ConsoleLogger } from "./console.logger";
import { rankedLogLevels, type ILogger, type LogLevel } from "./interfaces";

/**
 * Main class to handle and configure logging with multiple logger implementations.
 * Unlike Logger implementations, this class provides static methods to manage global logging configuration and registered loggers,
 * as well as helper functions to create ContextLoggers and temporarily override loggers for specific code blocks.
 * 
 * You can also register multiple loggers that implement the ILogger interface, which will all receive the log events that pass the log level filter.
 * If no loggers are registered, a default ConsoleLogger will be used to output to the console.
 * 
 * The LogLevel can be set globally for all loggers through the `setLogLevel` method, which will filter out any log events below the specified level.
 * Each registered Logger instance can have its own level, but none can bypass the global level set by this class.
 * 
 * If you need to temporarily redirect all log events to a specific logger for a block of code, you can use the `withLogger` helper function, 
 * which will override the logger implementation during the execution of the provided function and reset it afterward. 
 */
export class Logger {

    protected static logLevel: LogLevel = 'info';

    protected static loggerMap: Map<string, ILogger> = new Map<string, ILogger>();

    protected static levelSupport: Record<LogLevel, boolean> = {
        trace: rankedLogLevels['trace'] >= rankedLogLevels[this.logLevel],
        debug: rankedLogLevels['debug'] >= rankedLogLevels[this.logLevel],
        info: rankedLogLevels['info'] >= rankedLogLevels[this.logLevel],
        warn: rankedLogLevels['warn'] >= rankedLogLevels[this.logLevel],
        error: rankedLogLevels['error'] >= rankedLogLevels[this.logLevel],
        fatal: rankedLogLevels['fatal'] >= rankedLogLevels[this.logLevel],
    };

    /**
     * Globally set the logging level for all Rule engine classes.
     * @param level the level at which to start logging events.
     */
    public static setLogLevel(level: LogLevel): void {
        this.logLevel = level;

        // Update level support for all log levels based on the new log level
        for (const logLevel of Object.keys(this.levelSupport) as LogLevel[]) {
            this.levelSupport[logLevel] = rankedLogLevels[logLevel] >= rankedLogLevels[this.logLevel];
        }
    }

    public static setLoggerLevels(levels: Record<string, LogLevel>): void {
        for (const [loggerName, level] of Object.entries(levels)) {
            const logger = this.loggerMap.get(loggerName);
            if (logger) {
                logger.setLogLevel(level);

            } else {
                console.warn(`Logger "${loggerName}" not found among registered loggers.`);
            }
        }
    }

    public static getLogLevel(): LogLevel {
        return this.logLevel;
    }

    public static canLog(level: LogLevel): boolean {
        return this.levelSupport[level];
    }

    protected static perform(logger: ILogger | any, func: string, msg: string, ...args: unknown[]) {
        if (logger && logger[func] && typeof logger[func] === 'function') {
            logger[func](msg, ...args);
        }
    }

    protected static performAll(func: LogLevel, msg: string, ...args: unknown[]) {
        const canLog = this.levelSupport[func];
        if (!canLog) {
            return;
        }
        const impl = this.getImpl() as ILogger;
        if (impl !== this) {
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
        this.performAll('trace', msg, ...args);
    }

    public static debug(msg: string, ...args: unknown[]): void {
        this.performAll('debug', msg, ...args);
    }

    public static info(msg: string, ...args: unknown[]): void {
        this.performAll('info', msg, ...args);
    }

    public static warn(msg: string, ...args: unknown[]): void {
        this.performAll('warn', msg, ...args);
    }

    public static error(msg: string, ...args: unknown[]): void {
        this.performAll('error', msg, ...args);
    }

    public static fatal(msg: string, ...args: unknown[]): void {
        this.performAll('fatal', msg, ...args);
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
     * List the currently registered loggers.
     * @returns a map of logger identifiers to their ILogger implementations.
     */
    public static registeredLoggers(): Map<string, ILogger> {
        return new Map(this.loggerMap);
    }

    protected static override?: ILogger;

    /**
     * Override the current logger implementation with a custom logger.
     * This is useful for temporarily redirecting all log events to a specific logger.
     * You should not need to call this method directly. 
     * Instead, use the `withLogger` helper function to execute a block of code with a temporary logger override.
     * 
     * @param logger the custom logger to use.
     */
    public static overrideWith(logger: ILogger): void {
        this.override = logger;
    }

    /**
     * Reset any active logger override, returning to the default logging behavior.
     * You should not need to call this method directly.
     */
    public static resetOverride(): void {
        this.override = undefined;
    }

    private static getImpl(): ILogger {
        return this.override ?? this;
    }
}

// export const logger = Logger;
