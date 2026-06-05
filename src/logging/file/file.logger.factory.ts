import type { UsesFileSystem } from "../../node/interfaces";
import type { ILogger, LogLevel } from "../interfaces";
import type { LoggedEventFormatter } from "./event.formatter";
import { RotatingBoundaryFileLogger } from "./rotating.boundary.file.logger";
import { RotatingIntervalFileLogger } from "./rotating.interval.file.logger";
import { RotatingSizeFileLogger } from "./rotating.size.file.logger";
import { SingleFileLogger } from "./single.file.logger";

export type RotationMode =
    | { kind: 'size'; maxBytes: number }
    | { kind: 'run' }
    | { kind: 'interval'; everySeconds: number }
    | { kind: 'boundary'; unit: 'hour' | 'day' | 'week' | 'month'; utc?: boolean };

export interface FileLoggerOptions {
    directory: string;
    baseName?: string;
    level?: LogLevel;
    formatter?: LoggedEventFormatter;
    rotation?: RotationMode;
    maxFiles?: number;
}

interface FileSystemLogger extends ILogger, UsesFileSystem {
}

export class FileLoggerFactory {

    public static create(options: FileLoggerOptions, fs?: typeof import('fs')): FileSystemLogger {
        // if (typeof window !== 'undefined') {
        //     throw new Error('FileLogger is not supported in browser environments.');
        // }
        const logger = this.instantiate(options);
        if (fs) {
            logger.withFS(fs);
        } else {
            logger.loadFileSystem();    // although async, we don't await it here. The logger will queue logs until the file system is ready.
        }
        return logger;
    }

    protected static instantiate(options: FileLoggerOptions): FileSystemLogger {

        if (options.rotation) {
            switch (options.rotation.kind) {
                case 'size':
                    return new RotatingSizeFileLogger(options);
                case 'run':
                    return new SingleFileLogger(options);
                case 'interval':
                    return new RotatingIntervalFileLogger(options);
                case 'boundary':
                    return new RotatingBoundaryFileLogger(options);

                default:
                    throw new Error(`Invalid rotation mode: ${(options.rotation as any).kind}`);
            }

        } else {
            return new SingleFileLogger(options);
        }
    }
}
