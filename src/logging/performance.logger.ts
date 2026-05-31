import type { LogLevel } from "./interfaces";
import { WorkLogger } from "./work.logger";

export interface PerformanceLogData {
  duration: number,
  heap_delta?: number,
  message: string
};

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

  public static start(level: LogLevel, label: string): PerformanceLogger {
    return new PerformanceLogger(level, label);
  }

  constructor(level: LogLevel, label: string) {
    this.level = level;
    this.label = label;

    this.start();
  }

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

  private start(): void {
    this.started = performance.now();
    this.initial_heap = PerformanceLogger.platform === 'node' ? process.memoryUsage().heapUsed : undefined;
  }

  public lap(): PerformanceLogData {
    const point = this.checkpoint();
    this.start();
    return point;
  }

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