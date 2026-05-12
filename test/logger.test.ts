import { describe, it } from "vitest";
import { WorkLogger } from "../src/log/work.logger";

describe('Logger tests', () => {

    it('default usage', async () => {

        WorkLogger.setLogLevel('debug');

        WorkLogger.trace('Trace message');
        WorkLogger.debug('Debug message', { context: 'Hello world' });
        WorkLogger.info('Info message');
        WorkLogger.warn('Warn message');
        WorkLogger.error('Error message without error');
        WorkLogger.error('Error message with error', new Error('Hello world'));
        WorkLogger.fatal('Fatal message');
        WorkLogger.log('warn', 'Warn Level message', 'warn');
        WorkLogger.log('debug', 'Debug Level message', 'warn');
        WorkLogger.log('fatal', 'Fatal Level message', 'warn');
    });

});