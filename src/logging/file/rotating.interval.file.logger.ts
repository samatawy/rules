import { AbstractFileLogger } from "./abstract.file.logger";
import { formatFileDate } from "./file.date";
import type { FileLoggerOptions } from "./file.logger.factory";

export class RotatingIntervalFileLogger extends AbstractFileLogger {

    private everySeconds: number;

    private createdAt?: Date;

    constructor(options: FileLoggerOptions) {
        super(options);
        if (options.rotation?.kind !== 'interval') {
            throw new Error('RotatingIntervalFileLogger requires rotation mode to be interval-based.');
        }
        this.everySeconds = options.rotation.everySeconds;
    }

    protected resolveFileName(time?: number): string {
        const baseName = this.options.baseName || 'log';
        const now = time ?? Date.now();
        return `${baseName}.${formatFileDate(now)}.log`;
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
        const elapsedSeconds = (now.getTime() - this.createdAt.getTime()) / 1000;
        if (elapsedSeconds >= this.everySeconds) {
            this.createdAt = now;
            return true;
        }

        return false;
    }

    protected afterFileOpen(): void {
        this.createdAt = new Date();
    }

    protected afterWrite(bytesWritten: number): void {
        // No additional actions needed after writing for interval-based rotation
    }

}
