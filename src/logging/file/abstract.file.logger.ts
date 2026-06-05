import type { UsesFileSystem } from "../../node/interfaces";
import { AbstractLogger } from "../abstract.logger";
import type { LoggedEvent, LogLevel } from "../interfaces";
import type { FileLoggerOptions } from "./file.logger.factory";

export abstract class AbstractFileLogger extends AbstractLogger implements UsesFileSystem {

    protected static fsPromise?: Promise<typeof import('fs') | undefined>;

    protected static textEncoder = new TextEncoder();

    protected readonly options: FileLoggerOptions;

    protected readonly events: LoggedEvent[] = [];

    protected fs?: typeof import('fs');

    protected directory_ready = false;

    protected current_file?: string;

    protected current_stream?: import('fs').WriteStream;

    protected readonly run_started_at = Date.now();

    constructor(options: FileLoggerOptions) {
        super();
        this.options = options;
        if (options.level) {
            this.setLogLevel(options.level);
        }
    }

    public trace(msg: string, ...args: unknown[]): void {
        this.log('trace', msg, ...args);
    }

    public debug(msg: string, ...args: unknown[]): void {
        this.log('debug', msg, ...args);
    }

    public info(msg: string, ...args: unknown[]): void {
        this.log('info', msg, ...args);
    }

    public warn(msg: string, ...args: unknown[]): void {
        this.log('warn', msg, ...args);
    }

    public error(msg: string, ...args: unknown[]): void {
        this.log('error', msg, ...args);
    }

    public fatal(msg: string, ...args: unknown[]): void {
        this.log('fatal', msg, ...args);
    }

    public log(level: LogLevel, msg: string, ...args: unknown[]): void {
        if (!this.canLog(level)) {
            return;
        }
        this.events.push({
            timestamp: Date.now(),
            level,
            message: msg,
            args,
        });
    }

    public flush(): void {
        if (this.events.length === 0) {
            return;
        }

        if (!this.ensureFileSystem()) {
            return;
        }

        const payload = this.events
            .map((event) => this.formatEvent(event))
            .join('\n') + '\n';

        const out = this.openStream(this.byteLength(payload));
        if (!out) {
            return;
        }

        this.writeToFile(payload);
        this.events.length = 0;
    }

    public withFS(fs: typeof import('fs')): this {
        this.fs = fs;
        return this;
    }

    public async loadFileSystem(): Promise<any> {
        if (!(typeof process !== 'undefined' && process.versions?.node)) {
            this.reportError("fs module requested but not found - Cannot use file system in browser environment");
            return undefined;
        }

        try {
            AbstractFileLogger.fsPromise ??= import('fs');
            this.fs = await AbstractFileLogger.fsPromise;
            return this.fs;
        } catch {
            this.reportError("fs module requested but not found - Cannot use file system in browser environment");
            return undefined;
        }
    }

    public getCurrentFile(): string | undefined {
        return this.current_file;
    }

    protected ensureFileSystem(): typeof import('fs') | undefined {
        if (this.fs) {
            return this.fs;
        }

        this.reportError("Call withFS(fs) or await loadFileSystem() first.");
        return undefined;
    }

    protected ensureDirectory(): void {
        const fs = this.ensureFileSystem();
        if (!fs || this.directory_ready) {
            return;
        }

        fs.mkdirSync(this.options.directory, { recursive: true });
        this.directory_ready = true;
    }

    protected abstract mustCreateFile(time: number, nextBytes: number): boolean;

    protected abstract afterFileOpen(): void;

    protected abstract afterWrite(bytesWritten: number): void;

    protected abstract resolveFileName(time?: number): string;
    // protected abstract resolveFileName(now = Date.now()): string;
    //  {
    //     const baseName = this.options.baseName || 'log';
    //     return `${baseName}.${this.run_started_at}.log`;
    // }

    protected resolvePath(filename: string): string {
        const dir = this.options.directory.replace(/[\\/]+$/, '');
        return `${dir}/${filename}`;
    }

    protected formatEvent(event: LoggedEvent): string {
        if (this.options.formatter) {
            return this.options.formatter.format(event);
        }

        return `${new Date(event.timestamp).toISOString()} [${event.level.toUpperCase()}] ${event.message} ${event.args.map(arg => JSON.stringify(arg)).join(' ')}`;
    }

    protected writeToFile(formattedMessage: string): void {
        if (this.current_stream) {
            this.current_stream.write(formattedMessage);
        }
        this.afterWrite(this.byteLength(formattedMessage));
    }

    protected openStream(nextBytes = 0): import('fs').WriteStream | undefined {
        const now = Date.now();

        if (!this.current_stream || this.mustCreateFile(now, nextBytes)) {
            this.close();
            const nextFile = this.resolveFreshFileName(now);
            this.current_file = nextFile;
            this.current_stream = this.openFile(nextFile);
        }

        return this.current_stream;
    }

    private resolveFreshFileName(time = Date.now()): string {
        let candidate = this.resolveFileName(time);
        const fs = this.ensureFileSystem();
        while (candidate === this.current_file || (fs ? fs.existsSync(this.resolvePath(candidate)) : false)) {
            time += 1;
            candidate = this.resolveFileName(time);
        }
        return candidate;
    }

    protected openFile(filename: string): import('fs').WriteStream | undefined {
        const fs = this.ensureFileSystem();
        if (!fs || !filename) {
            return undefined;
        }

        this.ensureDirectory();
        const filePath = this.resolvePath(filename);
        // Ensure the file exists before creating the stream so subclasses can inspect it immediately.
        fs.closeSync(fs.openSync(filePath, 'a'));
        const stream = fs.createWriteStream(filePath, { flags: 'a' });
        stream.on('error', (err) => {
            this.reportError(`Error writing to log file '${filePath}': ${err.message}`);
        });
        this.afterFileOpen();
        return stream;
    }

    protected byteLength(text: string): number {
        return AbstractFileLogger.textEncoder.encode(text).length;
    }

    public close(): void {
        if (this.current_stream) {
            this.current_stream.end();
            this.current_stream = undefined;
        }
    }

    protected reportError(message: string): void {
        console.error(message);
    }

}
