import type { WorkingContext } from "../interfaces";
import { AbstractLogger } from "./abstract.logger";
import { ConsoleLogger } from "./console.logger";
import type { ILogger, LoggedEvent, LogLevel } from "./interfaces";
import { Logger } from "./logger";

/**
 * Logger implementation to handle and configure logging for a specific working context.
 * This allows you to log events related to that context and manage them separately from other contexts.
 * 
 * N.B. This does not immediately write to the registered loggers, it stores the events in a local array until the flush method is called.
 * This allows you to control when the events are actually logged, for example after a certain operation is completed or when an error occurs.
 * 
 * N.B. If you need to use the loggers registered in Logger, you can create a ContextLogger through `getContextLogger()` 
 * to automatically register all loggers from Logger to the new ContextLogger.
 * You can also register and unregister loggers directly to a ContextLogger, which will not affect the loggers registered in Logger or other ContextLoggers.
 */
export class ContextLogger extends AbstractLogger {

    private loggerMap: Map<string, ILogger> = new Map<string, ILogger>();

    private events: LoggedEvent[] = [];

    /**
     * Create a new ContextLogger for a specific working context.
     * 
     * N.B. If you need to use the loggers registered in Logger, you can create a ContextLogger through `getContextLogger()` 
     * to automatically register all loggers from Logger to the new ContextLogger.
     * @param context the working context to associate with this logger.
     */
    constructor(private context: WorkingContext) {
        super();
    }

    protected perform(logger: ILogger | any, func: string, msg: string, ...args: unknown[]) {
        if (logger && logger[func] && typeof logger[func] === 'function') {
            logger[func](msg, ...args);
        }
    }

    protected addEvent(level: LogLevel, msg: string, ...args: unknown[]): void {
        this.events.push({
            timestamp: Date.now(),
            level,
            message: msg,
            args
        });
    }

    protected performAll(event: LoggedEvent): void {
        if (this.loggerMap.size === 0) {
            this.loggerMap.set('console', new ConsoleLogger());
        }
        for (const logger of this.loggerMap.values()) {
            this.perform(logger, event.level, event.message, ...event.args);
        }
    }

    public trace(msg: string, ...args: unknown[]): void {
        this.addEvent('trace', msg, ...args);
    }

    public debug(msg: string, ...args: unknown[]): void {
        this.addEvent('debug', msg, ...args);
    }

    public info(msg: string, ...args: unknown[]): void {
        this.addEvent('info', msg, ...args);
    }

    public warn(msg: string, ...args: unknown[]): void {
        this.addEvent('warn', msg, ...args);
    }

    public error(msg: string, ...args: unknown[]): void {
        this.addEvent('error', msg, ...args);
    }

    public fatal(msg: string, ...args: unknown[]): void {
        this.addEvent('fatal', msg, ...args);
    }

    public log(level: LogLevel, msg: string, ...args: unknown[]): void {
        switch (level) {
            case 'trace': this.trace(msg, ...args); break;
            case 'debug': this.debug(msg, ...args); break;
            case 'info': this.info(msg, ...args); break;
            case 'warn': this.warn(msg, ...args); break;
            case 'error': this.error(msg, ...args); break;
            case 'fatal': this.fatal(msg, ...args); break;
        }
    }

    /**
     * Register a new bridge to connect your preferred logging library through an ILogger implementation.
     * @param name the local identifier for the bridge.
     * @param logger an implementation of ILogger to register.
     */
    public register(name: string, logger: ILogger): void {
        this.loggerMap.set(name, logger);
    }

    /**
     * Remove a previously connected bridge to an external logging library.
     * @param logger the identifier of the bridge (used to register).
     */
    public unregister(logger: string | ILogger): void {
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
     * Flush all logged events to the registered loggers, writing them using any registered loggers.
     * This allows you to control when the events are actually logged, 
     * for example after a certain operation is completed or when an error occurs.
     */
    public flush(): void {
        for (const event of this.events) {
            if (this.canLog(event.level)) {
                this.performAll(event);
            }
        }
        this.events = [];
    }

}

export function getContextLogger(context: WorkingContext): ContextLogger {
    const logger = new ContextLogger(context);
    logger.setLogLevel(Logger.getLogLevel());
    for (const [name, loggerInstance] of Logger.registeredLoggers()) {
        logger.register(name, loggerInstance);
    }
    return logger;
}
