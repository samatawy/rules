import type { ILogger, LogLevel } from "./interfaces";
import { Logger } from "./logger";
import { MessageFormatter } from "./message.formatter";

export interface StopwatchData {
  duration: number,
  cpu_user?: number;
  cpu_system?: number;
  heap_delta?: number,
  message: string,
};

/**
 * A utility class for measuring and logging the performance of code blocks, including execution time and memory usage.
 * It can be used to create checkpoints and laps, allowing for detailed performance analysis.
 * This class will automatically detect the environment (Node.js or browser) to provide relevant metrics.
 */
export class Stopwatch {

  private level: LogLevel;

  private label: string;

  private format?: MessageFormatter;

  private logger?: ILogger;

  private started?: number;

  private initial_cpu_user?: number;

  private initial_cpu_system?: number;

  private initial_heap?: number;

  private checkpoints: StopwatchData[] = [];

  private laps: StopwatchData[] = [];

  private finish_line?: StopwatchData;

  private static platform: 'node' | 'browser' | undefined;

  private static messageFmt = MessageFormatter.using("{label}[? took {duration} ms][? with cpu {cpu_user} us (user) and {cpu_system} us (system) with {heap_delta} bytes (heap)]");

  static {
    Stopwatch.platform = typeof process !== 'undefined' && process.versions?.node ? 'node'
      : typeof performance !== 'undefined' ? 'browser'
        : undefined;
  }

  /**
   * Start a new performance logger with the given log level and label.
   * Nothing will be written to the log until the end method is called.
   * @param level the log level to use for logging performance data.
   * @param label a descriptive label for the performance measurement (to be shown in logs).
   * @returns a new instance of Stopwatch.
   */
  public static start(level: LogLevel, label: string): Stopwatch {
    return new Stopwatch(level, label);
  }

  constructor(level: LogLevel, label: string) {
    this.level = level;
    this.label = label;

    this.doStart();
    this.laps = [];
  }

  public useFormatter(formatter: MessageFormatter): this {
    this.format = formatter;
    return this;
  }

  public useLogger(logger?: ILogger): this {
    this.logger = logger || Logger;
    return this;
  }

  private buildMessage(label: string, data: any): string {
    return (this.format || Stopwatch.messageFmt).format({
      label,
      cpu_user: data.cpu_user,
      cpu_system: data.cpu_system,
      duration: data.duration,
      heap_delta: data.heap_delta,
    });
  }

  private buildPoint(label?: string): StopwatchData {
    const duration = performance.now() - (this.started!);
    const point: StopwatchData = { duration, message: '' };

    if (Stopwatch.platform === 'node') {
      point.cpu_user = process.cpuUsage().user - this.initial_cpu_user!;
      point.cpu_system = process.cpuUsage().system - this.initial_cpu_system!;
      const final_heap = process.memoryUsage().heapUsed;
      point.heap_delta = this.initial_heap !== undefined ? final_heap - this.initial_heap! : undefined;

      point.message = this.buildMessage(label || this.label, {
        duration,
        cpu_user: point.cpu_user,
        cpu_system: point.cpu_system,
        heap_delta: point.heap_delta
      });

    } else {
      point.message = this.buildMessage(label || this.label, { duration });
    }
    return point;
  }

  private doStart(): void {
    this.started = performance.now();
    this.initial_cpu_user = Stopwatch.platform === 'node' ? process.cpuUsage().user : undefined;
    this.initial_cpu_system = Stopwatch.platform === 'node' ? process.cpuUsage().system : undefined;
    this.initial_heap = Stopwatch.platform === 'node' ? process.memoryUsage().heapUsed : undefined;
    this.checkpoints = [{ duration: 0, cpu_user: 0, cpu_system: 0, heap_delta: 0, message: `${this.label} started` }];
  }

  /**
   * Create a checkpoint for the current performance measurement, capturing the duration and memory usage since the last start or lap.
   * This can be used for example, to find out which part of a process is taking the most time or memory,
   * or to detect peak heap usage during a process (before the garbage collector cleans up after a scope exits).
   * This does not write to a log by itself.
   * N.B. Checkpoints differ from laps in that they do not reset any values (cumulative).
   * @returns an object containing the duration, heap delta, and a formatted message.
   */
  public checkpoint(label?: string): StopwatchData {
    const point = this.buildPoint(label || this.label);

    this.checkpoints.push(point);
    return point;
  }

  public logCheckpoint(label?: string): StopwatchData {
    const point = this.checkpoint(label);
    (this.logger || Logger).log(this.level, point.message);
    return point;
  }

  /**
   * Create a lap for the current performance measurement, capturing the duration and memory usage since the last start or lap.
   * This can be used to measure intermediate steps within a process.
   * This does not write to a log by itself.
   * N.B. Laps differ from checkpoints in that they reset all values (clean slate).
   * @returns an object containing the duration, heap delta, and a formatted message.
   */
  public lap(label?: string): StopwatchData {
    const point = this.buildPoint(label || this.label);
    this.doStart();
    this.laps.push(point);
    return point;
  }

  public logLap(label?: string): StopwatchData {
    const point = this.lap(label);
    (this.logger || Logger).log(this.level, point.message);
    return point;
  }

  /**
   * End the performance measurement and log the final results, including total duration and memory usage change, along with any provided metadata.
   * This actually writes to a log (through Logger) with the specified log level and includes the label for context.
   * The metadata parameter can be used to include additional contextual information in the logs, such as input sizes, configuration options, 
   * or any other relevant data that can help in analyzing the performance results.
   * @param metadata an object containing additional contextual information to be included in the performance log.
   * @returns an object containing the duration, heap delta, and a formatted message.
   */
  public end(label?: string, metadata?: Record<string, any>): StopwatchData {
    const point = this.buildPoint(label || this.label);
    this.finish_line = point;

    // const message = this.buildMessage(label || this.label, { duration: point.duration, heap_delta: point.heap_delta });

    // if (this.logger) {
    //   this.logger.log(this.level, message, metadata);
    // }
    return point;
  }

  public logEnd(label?: string, metadata?: Record<string, any>): StopwatchData {
    const point = this.end(label, metadata);

    (this.logger || Logger).log(this.level, point.message, metadata);
    return point;
  }

  public metrics(): any {
    let total_duration = 0;
    let fastest_lap: number = 0;
    let slowest_lap: number = 0;
    let average_lap: number = 0;
    let total_cpu_user: number = 0;
    let total_cpu_system: number = 0;
    let peak_heap_usage: number = 0;
    const lastPoint = this.finish_line || this.checkpoints[this.checkpoints.length - 1];

    if (this.laps.length > 0) {
      total_duration = this.laps.reduce((sum, lap) => sum + lap.duration, 0);
      fastest_lap = this.laps.reduce((fastest, lap) => lap.duration < fastest ? lap.duration : fastest, this.laps[0]!.duration);
      slowest_lap = this.laps.reduce((slowest, lap) => lap.duration > slowest ? lap.duration : slowest, this.laps[0]!.duration);
      average_lap = total_duration / this.laps.length;

      total_cpu_user = this.laps.reduce((sum, checkpoint) => sum + (checkpoint.cpu_user || 0), 0);
      total_cpu_system = this.laps.reduce((sum, checkpoint) => sum + (checkpoint.cpu_system || 0), 0);
      peak_heap_usage = this.laps.reduce((peak, checkpoint) => checkpoint.heap_delta !== undefined && checkpoint.heap_delta > peak ? checkpoint.heap_delta : peak, 0);

    } else if (lastPoint) {
      total_duration = lastPoint.duration;
      fastest_lap = lastPoint.duration;
      slowest_lap = lastPoint.duration;
      average_lap = lastPoint.duration;

      total_cpu_user = lastPoint.cpu_user || 0;
      total_cpu_system = lastPoint.cpu_system || 0;
      peak_heap_usage = lastPoint.heap_delta || 0;
    }

    if (this.finish_line) {
      total_duration += this.finish_line.duration;
      total_cpu_user += this.finish_line.cpu_user || 0;
      total_cpu_system += this.finish_line.cpu_system || 0;
      if (this.finish_line.heap_delta !== undefined && this.finish_line.heap_delta > peak_heap_usage) {
        peak_heap_usage = this.finish_line.heap_delta;
      }
    }

    const metrics: any = {
      total_duration,
      total_cpu_user,
      total_cpu_system,
      peak_heap_usage
    };

    if (this.checkpoints.length > 1) {
      metrics.checkpoint_count = this.checkpoints.length - 1;
    }

    if (this.laps.length > 0) {
      metrics.fastest_lap = fastest_lap;
      metrics.slowest_lap = slowest_lap;
      metrics.average_lap = average_lap;
      metrics.laps = this.laps;
    }

    if (this.finish_line) {
      metrics.finish_line = this.finish_line;
    }
    return metrics;
  }

  public logMetrics(): any {
    const metrics = this.metrics();
    if (this.logger) {
      this.logger.log(this.level, "Performance Metrics", metrics);
    }
    return metrics;
  }

}