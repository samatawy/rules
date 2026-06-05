import { describe, expect, it } from "vitest";
import { Logger, MemoryLogger, NoopLogger, Stopwatch } from "../src/logging";
import { MessageFormatter } from "../src/logging";
import { LoggedEventFormatter } from "../src/logging/file";

describe('Logger tests', () => {

    it('default usage', async () => {

        Logger.setLogLevel('debug');

        Logger.trace('Trace message');
        Logger.debug('Debug message', { context: 'Hello world' });
        Logger.info('Info message');
        Logger.warn('Warn message');
        Logger.error('Error message without error');
        Logger.error('Error message with error', new Error('Hello world'));
        Logger.fatal('Fatal message');
        Logger.log('warn', 'Warn Level message', 'warn');
        Logger.log('debug', 'Debug Level message', 'warn');
        Logger.log('fatal', 'Fatal Level message', 'waßrn');

        let stopwatch = Stopwatch.start('info', 'Test performance logger');
        // await new Promise(resolve => setTimeout(resolve, 100));
        stopwatch.logLap('First lap');
        // console.debug(stopwatch.lap('First lap').message);
        // await new Promise(resolve => setTimeout(resolve, 200));
        // console.debug(stopwatch.lap('Second lap').message);
        stopwatch.logLap('Second lap');
        stopwatch.logEnd('End of performance test', { additional: 'metadata' });
        stopwatch.logMetrics();

        stopwatch = Stopwatch.start('info', 'Test performance logger')
            .useFormatter(MessageFormatter.using('{label}:[? {duration} ms][? - heap {heap_delta} b]'))
            .useLogger(Logger);
        await new Promise(resolve => setTimeout(resolve, 100));
        console.debug(stopwatch.lap('First lap').message);
        await new Promise(resolve => setTimeout(resolve, 200));
        console.debug(stopwatch.lap('Second lap').message);
        stopwatch.logEnd('End of performance test', { additional: 'metadata' });

        stopwatch.logMetrics();
    });

    it('built-in memory and noop loggers', () => {
        const memory = new MemoryLogger().setLogLevel('debug');
        const silent = new NoopLogger().setLogLevel('trace');

        memory.info('hello', { value: 1 });
        memory.debug('debugging');
        silent.error('ignored');

        expect(memory.events).toHaveLength(2);
        expect(memory.events[0]?.level).toBe('info');
        expect(memory.events[0]?.message).toBe('hello');
        expect(memory.events[0]?.args).toEqual([{ value: 1 }]);
        expect(memory.events[1]?.level).toBe('debug');

        memory.flush();
        expect(memory.events).toHaveLength(0);
    });

    it('formats remaining logger args with args and wildcard placeholders', () => {
        const event = {
            timestamp: Date.UTC(2026, 5, 5, 10, 15, 30),
            level: 'warn' as const,
            message: 'Rule evaluation took longer than expected',
            args: [{ workspace: 'pricing' }, 2, true],
        };

        const withArgs = LoggedEventFormatter
            .using('{timestamp} [{level}] {message} :: {0}[? :: {args}]')
            .format(event);

        expect(withArgs).toBe(
            '2026-06-05T10:15:30.000Z [WARN] Rule evaluation took longer than expected :: {"workspace":"pricing"} :: [2, true]'
        );

        const withWildcard = LoggedEventFormatter
            .using('{message}[? | first={0}][? | rest={*}]')
            .format(event);

        expect(withWildcard).toBe(
            'Rule evaluation took longer than expected | first={"workspace":"pricing"} | rest=[2, true]'
        );

        const onlyIndexed = LoggedEventFormatter
            .using('{message}[? | first={0}][? | second={1}][? | rest={args}]')
            .format(event);

        expect(onlyIndexed).toBe(
            'Rule evaluation took longer than expected | first={"workspace":"pricing"} | second=2 | rest=[true]'
        );

        const skippedIndexedBlock = LoggedEventFormatter
            .using('{message}[? | missing={9}][? | rest={args}]')
            .format(event);

        expect(skippedIndexedBlock).toBe(
            'Rule evaluation took longer than expected | rest=[{"workspace":"pricing"}, 2, true]'
        );
    });

});