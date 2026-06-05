import type { ILogger } from "./interfaces";
import { Logger } from "./logger";

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
 *      Logger.info("This will be logged using the custom logger.");
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
        Logger.overrideWith(logger);
        try {
            return fn(...args);
        } finally {
            Logger.resetOverride(); // Clear the override after the function execution
        }
    };
}