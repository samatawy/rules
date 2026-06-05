import { AbstractFileLogger } from "./abstract.file.logger";
import { formatFileDate } from "./file.date";
import type { FileLoggerOptions } from "./file.logger.factory";

export class RotatingBoundaryFileLogger extends AbstractFileLogger {

    private boundary: 'hour' | 'day' | 'week' | 'month';

    private utc?: boolean

    private createdAt?: Date;

    constructor(options: FileLoggerOptions) {
        super(options);
        if (options.rotation?.kind !== 'boundary') {
            throw new Error('RotatingBoundaryFileLogger requires rotation mode to be boundary-based.');
        }
        this.boundary = options.rotation.unit;
        this.utc = options.rotation.utc;
    }

    protected resolveFileName(time?: number): string {
        const baseName = this.options.baseName || 'log';
        const now = time ?? Date.now();
        return `${baseName}.${formatFileDate(now, { utc: this.utc })}.log`;
    }

    protected mustCreateFile(time: number, nextBytes: number): boolean {
        if (!this.current_file || !this.createdAt) {
            return true;
        }

        const fs = this.ensureFileSystem();
        if (!fs) {
            return false;
        }

        const now = new Date();
        const key = this.boundaryKey(now.getTime());
        const currentKey = this.boundaryKey(this.createdAt.getTime());
        return key !== currentKey;
    }

    protected afterFileOpen(): void {
        this.createdAt = new Date();
    }

    protected afterWrite(bytesWritten: number): void {
        // No additional actions needed after writing for boundary-based rotation
    }

    private boundaryKey(now: number): string {
        const date = new Date(now);
        const utc = this.utc;
        const year = utc ? date.getUTCFullYear() : date.getFullYear();
        const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
        const day = utc ? date.getUTCDate() : date.getDate();
        const hour = utc ? date.getUTCHours() : date.getHours();

        switch (this.boundary) {
            case 'hour':
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}`;
            case 'week': {
                const week = this.isoWeek(date, utc);
                return `${year}-W${String(week).padStart(2, '0')}`;
            }
            case 'month':
                return `${year}-${String(month).padStart(2, '0')}`;
            case 'day':
            default:
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }

    private isoWeek(date: Date, utc = false): number {
        const working = new Date(date.getTime());
        const day = utc ? (working.getUTCDay() || 7) : (working.getDay() || 7);

        if (utc) {
            working.setUTCDate(working.getUTCDate() + 4 - day);
            const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
            return Math.ceil((((working.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        }

        working.setDate(working.getDate() + 4 - day);
        const yearStart = new Date(working.getFullYear(), 0, 1);
        return Math.ceil((((working.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

}
