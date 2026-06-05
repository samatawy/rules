/// <reference types="node" />

import fs from 'fs';
import path from 'path';
import { setTimeout as delay } from 'timers/promises';
import { FileLoggerFactory, type FileLoggerOptions } from '../src/logging/file/file.logger.factory';

const rootDir = path.resolve(process.cwd(), 'tmp', 'file-logger-smoke');

type ScenarioName = 'single' | 'size' | 'interval' | 'boundary' | 'all';

interface FileSnapshot {
    name: string;
    fullPath: string;
    size: number;
    content: string;
}

function cleanDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
}

function describeDir(dir: string): void {
    const entries = fs.existsSync(dir)
        ? fs.readdirSync(dir).sort()
        : [];

    console.log(`Directory: ${dir}`);
    if (entries.length === 0) {
        console.log('  (empty)');
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        console.log(`  ${entry} - ${stat.size} bytes`);
        const preview = fs.readFileSync(fullPath, 'utf8').trim();
        if (preview) {
            console.log(`    ${preview.split('\n').slice(0, 3).join(' | ')}`);
        }
    }
}

function readDir(dir: string): FileSnapshot[] {
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs.readdirSync(dir)
        .sort()
        .map((entry) => {
            const fullPath = path.join(dir, entry);
            return {
                name: entry,
                fullPath,
                size: fs.statSync(fullPath).size,
                content: fs.readFileSync(fullPath, 'utf8'),
            };
        });
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function countOccurrences(files: FileSnapshot[], text: string): number {
    return files.reduce((count, file) => count + (file.content.includes(text) ? 1 : 0), 0);
}

function assertAppearsExactlyOnce(files: FileSnapshot[], text: string): void {
    const count = countOccurrences(files, text);
    assert(count === 1, `Expected '${text}' to appear exactly once across output files, but found ${count}.`);
}

function assertScenarioTitle(title: string, dir: string): FileSnapshot[] {
    console.log(`\nScenario: ${title}`);
    describeDir(dir);
    const files = readDir(dir);
    assert(files.length > 0, `Scenario '${title}' produced no log files.`);
    return files;
}

function makeLogger(options: FileLoggerOptions) {
    return FileLoggerFactory.create(options, fs);
}

function closeLogger(logger: unknown): void {
    if (logger && typeof logger === 'object' && 'close' in logger && typeof logger.close === 'function') {
        logger.close();
    }
}

async function runSingleScenario(): Promise<void> {
    const dir = path.join(rootDir, 'single');
    cleanDir(dir);

    const logger = makeLogger({
        directory: dir,
        baseName: 'single',
        rotation: { kind: 'run' },
    });

    logger.info('single message one', { step: 1 });
    logger.warn('single message two', { step: 2 });
    logger.flush();

    logger.info('single message three', { step: 3 });
    logger.flush();

    closeLogger(logger);
    await delay(50);
    const files = assertScenarioTitle('single', dir);
    assert(files.length === 1, `Expected single scenario to create exactly 1 file, but found ${files.length}.`);
    assert(files[0]!.content.indexOf('single message one') < files[0]!.content.indexOf('single message two'), 'Expected single message one before single message two.');
    assert(files[0]!.content.indexOf('single message two') < files[0]!.content.indexOf('single message three'), 'Expected single message two before single message three.');
}

async function runSizeScenario(): Promise<void> {
    const dir = path.join(rootDir, 'size');
    cleanDir(dir);

    const logger = makeLogger({
        directory: dir,
        baseName: 'size',
        rotation: { kind: 'size', maxBytes: 120 },
    });

    for (let index = 0; index < 4; index++) {
        logger.info(`size rotation message ${index + 1}`, { index, text: 'abcdefghijklmnopqrstuvwxyz' });
        logger.flush();
    }

    closeLogger(logger);
    await delay(50);
    const files = assertScenarioTitle('size', dir);
    assert(files.length >= 2, `Expected size scenario to rotate into at least 2 files, but found ${files.length}.`);
    for (let index = 1; index <= 4; index++) {
        assertAppearsExactlyOnce(files, `size rotation message ${index}`);
    }

    const maxBytes = 120;
    for (const file of files) {
        assert(file.size <= maxBytes, `Expected size-rotated file '${file.name}' to stay within ${maxBytes} bytes, but found ${file.size}.`);
    }
}

async function runIntervalScenario(): Promise<void> {
    const dir = path.join(rootDir, 'interval');
    cleanDir(dir);

    const logger = makeLogger({
        directory: dir,
        baseName: 'interval',
        rotation: { kind: 'interval', everySeconds: 1 },
    });

    logger.info('interval message one');
    logger.flush();
    await delay(1200);
    logger.info('interval message two');
    logger.flush();

    closeLogger(logger);
    await delay(50);
    const files = assertScenarioTitle('interval', dir);
    assert(files.length >= 2, `Expected interval scenario to rotate into at least 2 files, but found ${files.length}.`);
    assertAppearsExactlyOnce(files, 'interval message one');
    assertAppearsExactlyOnce(files, 'interval message two');
}

async function runBoundaryScenario(): Promise<void> {
    const dir = path.join(rootDir, 'boundary');
    cleanDir(dir);

    const logger = makeLogger({
        directory: dir,
        baseName: 'boundary',
        rotation: { kind: 'boundary', unit: 'hour' },
    });

    logger.info('boundary message one');
    logger.flush();

    // Force the next flush to see a different boundary without waiting for real time to pass.
    (logger as { createdAt?: Date }).createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

    logger.info('boundary message two');
    logger.flush();

    closeLogger(logger);
    await delay(50);
    const files = assertScenarioTitle('boundary', dir);
    assert(files.length >= 2, `Expected boundary scenario to rotate into at least 2 files, but found ${files.length}.`);
    assertAppearsExactlyOnce(files, 'boundary message one');
    assertAppearsExactlyOnce(files, 'boundary message two');
}

async function main(): Promise<void> {
    const scenario = (process.argv[2] as ScenarioName | undefined) || 'all';

    try {
        switch (scenario) {
            case 'single':
                await runSingleScenario();
                break;
            case 'size':
                await runSizeScenario();
                break;
            case 'interval':
                await runIntervalScenario();
                break;
            case 'boundary':
                await runBoundaryScenario();
                break;
            case 'all':
                await runSingleScenario();
                await runSizeScenario();
                await runIntervalScenario();
                await runBoundaryScenario();
                break;
            default:
                console.error(`Unknown scenario: ${scenario}`);
                console.error('Usage: node scripts/file-logger-smoke.ts [single|size|interval|boundary|all]');
                process.exitCode = 1;
                return;
        }

        console.log('\nSmoke validation passed.');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\nSmoke validation failed: ${message}`);
        process.exitCode = 1;
    }
}

void main();
