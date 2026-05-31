import type { LogLevel } from "./interfaces";
import { WorkLogger } from "./work.logger";

export class PerformanceLogger {

  private level: LogLevel;

  private label: string;

  private started: number;

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

  constructor(level: LogLevel, label: string) {
    this.level = level;
    this.label = label;

    this.started = performance.now();
    this.initial_heap = PerformanceLogger.platform === 'node' ? process.memoryUsage().heapUsed : undefined;
  }

  public checkpoint(): { duration: number, heap_diff?: number, message: string } {
    const duration = performance.now() - this.started;
    const final_heap = PerformanceLogger.platform === 'node' ? process.memoryUsage().heapUsed : undefined;
    const heap_diff = this.initial_heap !== undefined && final_heap !== undefined ? final_heap - this.initial_heap : undefined;

    let message = `${this.label} checkpoint at ${this.fmt(duration)}ms`;
    if (heap_diff !== undefined) {
      message += ` with heap change of ${this.fmt(heap_diff)} bytes`;
    }
    return { duration, heap_diff, message };
  }

  public end(metadata?: Record<string, any>): void {
    const duration = performance.now() - this.started;
    const final_heap = PerformanceLogger.platform === 'node' ? process.memoryUsage().heapUsed : undefined;
    const heap_delta = this.initial_heap !== undefined && final_heap !== undefined ? final_heap - this.initial_heap : undefined;

    let duration_str = this.fmt(duration);
    let heap_delta_str = heap_delta !== undefined ? this.fmt(heap_delta) : '';

    let message = `${this.label} took [${duration_str} ms]`;
    if (heap_delta !== undefined) {
      message += ` heap delta [${heap_delta_str} bytes]`;
    }
    WorkLogger.log(this.level, message, metadata);
  }

}