import { rankedLogLevels, type ILogger, type LogLevel } from "./interfaces";


/**
 * Abstract logger class that provides the core logging functionality for the Rule engine.
 * This class is not meant to be used directly. Instead, use the Logger class, which extends AbstractLogger and provides additional features.
 * If you want to create a custom logger, you can either extend AbstractLogger or implement the ILogger interface directly.
 * The Logger class includes a helper function `withLogger` to execute code blocks with a temporary logger override, which can be useful for testing or specific logging scenarios.
 * 
 * N.B. If you need to use the loggers registered in Logger, you can create a ContextLogger through `getContextLogger()`
 */
export abstract class AbstractLogger implements ILogger {

    private logLevel: LogLevel = 'info';

    public setLogLevel(level: LogLevel): this {
        this.logLevel = level;
        return this;
    }

    public canLog(level: LogLevel): boolean {
        const current = rankedLogLevels[this.logLevel];
        const required = rankedLogLevels[level];
        return current <= required;
    }

    public abstract trace(msg: string, ...args: unknown[]): void;
    public abstract debug(msg: string, ...args: unknown[]): void;
    public abstract info(msg: string, ...args: unknown[]): void;
    public abstract warn(msg: string, ...args: unknown[]): void;
    public abstract error(msg: string, ...args: unknown[]): void;
    public abstract fatal(msg: string, ...args: unknown[]): void;
    public abstract log(level: LogLevel, msg: string, ...args: unknown[]): void;
    public abstract flush(): void;

}
