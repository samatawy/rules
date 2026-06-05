import { AbstractFileLogger } from "./abstract.file.logger";
import { formatFileDate } from "./file.date";

export class SingleFileLogger extends AbstractFileLogger {

    protected resolveFileName(time?: number): string {
        const baseName = this.options.baseName || 'log';
        return `${baseName}.${formatFileDate(this.run_started_at)}.log`;
    }

    protected mustCreateFile(time: number, nextBytes: number): boolean {
        return !this.current_file;
    }

    protected afterFileOpen(): void {
        // No additional actions needed after file creation for single file logger
    }

    protected afterWrite(bytesWritten: number): void {
        // No additional actions needed after writing for single file logger
    }

}
