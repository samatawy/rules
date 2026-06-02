import type { LogLevel } from "./interfaces";
import { WorkLogger } from "./work.logger";

export interface PerformanceLogData {
  duration: number,
  heap_delta?: number,
  message: string
};

/**
 * A utility class for measuring and logging the performance of code blocks, including execution time and memory usage.
 * It can be used to create checkpoints and laps, allowing for detailed performance analysis.
 * The logger will automatically detect the environment (Node.js or browser) to provide relevant metrics.
 */
export class PerformanceLogger {

  private level: LogLevel;

  private label: string;

  private started?: number;

  private initial_heap?: number;

  private static platform: 'node' | 'browser' | undefined;

  private static numberFmt = new Intl.NumberFormat('en-US', { notation: 'standard', maximumFractionDigits: 3 }).format;

  static {
    PerformanceLogger.platform = typeof process !== 'undefined' && process.versions?.node ? 'node'
      : typeof performance !== 'undefined' ? 'browser'
        : undefined;
  }

  private fmt(value: number): string {
    return PerformanceLogger.numberFmt(value);
  }

  /**
   * Start a new performance logger with the given log level and label.
   * Nothing will be written to the log until the end method is called.
   * @param level the log level to use for logging performance data.
   * @param label a descriptive label for the performance measurement (to be shown in logs).
   * @returns a new instance of PerformanceLogger.
   */
  public static start(level: LogLevel, label: string): PerformanceLogger {
    return new PerformanceLogger(level, label);
  }

  constructor(level: LogLevel, label: string) {
    this.level = level;
    this.label = label;

    this.doStart();
  }

  /**
   * Create a checkpoint for the current performance measurement, capturing the duration and memory usage since the last start or lap.
   * This can be used for example, to find out which part of a process is taking the most time or memory,
   * or to detect peak heap usage during a process (before the garbage collector cleans up after a scope exits).
   * This does not write to a log by itself.
   * N.B. Checkpoints differ from laps in that they do not reset any values (cumulative).
   * @returns an object containing the duration, heap delta, and a formatted message.
   */
  public checkpoint(): PerformanceLogData {
    const duration = performance.now() - (this.started!);
    const final_heap = PerformanceLogger.platform === 'node' ? process.memoryUsage().heapUsed : undefined;
    const heap_delta = this.initial_heap !== undefined && final_heap !== undefined ? final_heap - this.initial_heap : undefined;

    let message = `${this.label} took ${this.fmt(duration)} ms`;
    if (heap_delta !== undefined) {
      message += ` with heap change of ${this.fmt(heap_delta)} bytes`;
    }
    return { duration, heap_delta, message };
  }

  private doStart(): void {
    this.started = performance.now();
    this.initial_heap = PerformanceLogger.platform === 'node' ? process.memoryUsage().heapUsed : undefined;
  }

  /**
   * Create a lap for the current performance measurement, capturing the duration and memory usage since the last start or lap.
   * This can be used to measure intermediate steps within a process.
   * This does not write to a log by itself.
   * N.B. Laps differ from checkpoints in that they reset all values (clean slate).
   * @returns an object containing the duration, heap delta, and a formatted message.
   */
  public lap(): PerformanceLogData {
    const point = this.checkpoint();
    this.doStart();
    return point;
  }

  /**
   * End the performance measurement and log the final results, including total duration and memory usage change, along with any provided metadata.
   * This actually writes to a log (through WorkLogger) with the specified log level and includes the label for context.
   * The metadata parameter can be used to include additional contextual information in the logs, such as input sizes, configuration options, 
   * or any other relevant data that can help in analyzing the performance results.
   * @param metadata an object containing additional contextual information to be included in the performance log.
   * @returns an object containing the duration, heap delta, and a formatted message.
   */
  public end(metadata?: Record<string, any>): PerformanceLogData {
    const point = this.checkpoint();

    let duration_str = this.fmt(point.duration);
    let heap_delta_str = point.heap_delta !== undefined ? this.fmt(point.heap_delta) : '';

    let message = `${this.label} took [${duration_str} ms]`;
    if (point.heap_delta !== undefined) {
      message += ` heap delta [${heap_delta_str} bytes]`;
    }
    WorkLogger.log(this.level, message, metadata);
    return point;
  }

}