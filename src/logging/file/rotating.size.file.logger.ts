import { AbstractFileLogger } from "./abstract.file.logger";
import { formatFileDate } from "./file.date";
import type { FileLoggerOptions } from "./file.logger.factory";

export class RotatingSizeFileLogger extends AbstractFileLogger {

    private maxBytes: number;

    private currentBytes = 0;

    constructor(options: FileLoggerOptions) {
        super(options);
        if (options.rotation?.kind !== 'size') {
            throw new Error('RotatingSizeFileLogger requires rotation mode to be size-based.');
        }
        this.maxBytes = options.rotation.maxBytes;
    }

    protected resolveFileName(time?: number): string {
        const baseName = this.options.baseName || 'log';
        const now = time ?? Date.now();
        return `${baseName}.${formatFileDate(now)}.log`;
    }

    protected mustCreateFile(time: number, nextBytes: number): boolean {
        if (!this.current_file) {
            return true;
        }
        if (this.currentBytes + nextBytes > this.maxBytes) {
            return true;
        }
        return false;
    }

    protected afterFileOpen(): void {
        if (!this.current_file) {
            return;
        }
        const fs = this.ensureFileSystem();
        if (!fs) {
            return;
        }
        const stat = fs.statSync(this.resolvePath(this.current_file));
        this.currentBytes = stat.size;
    }

    protected afterWrite(bytesWritten: number): void {
        this.currentBytes += bytesWritten;
    }

}
