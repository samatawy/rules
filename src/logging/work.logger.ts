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

    protected static performAll(func: LogLevel, msg: string, ...args: unknown[]) {
        const impl = this.getImpl() as ILogger;
        if (impl !== this) {
            if (impl.canLog(func)) {
                this.perform(impl, func, msg, ...args);
            }
            return;
        }

        if (!this.canLog(func)) {
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

/**
 * Helper function to execute a block of code with a temporary logger override.
 * This allows you to redirect all log events within the block to a specific logger without affecting the global logging configuration.
 * 
 * Example usage:
 * ```typescript
 * // Your custom logger implementation
 * const customLogger: ILogger = ...; 
 * 
 * withLogger(customLogger, () => {
 *      // Your code block where the custom logger is used
 *      WorkLogger.info("This will be logged using the custom logger.");
 * });
 * 
 * // For wrapping a standalone function with the custom logger:
 * withLogger(customLogger, functionName)(...args);
 * 
 * // For wrapping a class method with the custom logger:
 * withLogger(customLogger, class_method.bind(class_instance))(...args  );
 * ```
 * 
 * N.B. The logger override is only active during the execution of the provided function, including any level of nested function calls. 
 * Therefore, you only need this wrapper at the entry point of a code block.
 * Once the function completes, whether it returns successfully or throws an error, the logger will automatically reset to its previous state.
 * 
 * N.B. This is a simple implementation that does not support nested overrides. If you call `withLogger` within another `withLogger`, 
 * the inner call will overwrite the outer override until it resets, 
 * which may lead to unexpected logging behavior. Use with caution in complex scenarios.   
 * 
 * @param logger the custom logger to use within the block.
 * @param fn the function to execute with the temporary logger override.
 * @returns the result of the function execution.
 */
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
