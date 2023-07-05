import {describe, expect, it} from '@jest/globals';
import {createLogLevelFilterPipe, LOG_LEVELS, LogLevel} from '../src';

describe('LogLevelFilterPipe', () => {

    it('does not filter anything by default', () => {
        const pipe = createLogLevelFilterPipe();
        const args = [1, true, {}, ''];
        for (const level of LOG_LEVELS) {
            const resultArgs = pipe(level, ...args);
            expect(resultArgs).toEqual(args);
        }
    });

    it('filters log level messages when a log level is provided', () => {
        const excludedLogLevels: Array<LogLevel> = ['debug', 'trace'];
        const pipe = createLogLevelFilterPipe({excludedLogLevels});
        const args = [1, true, {}, ''];
        for (const level of LOG_LEVELS) {
            const resultArgs = pipe(level, ...args);
            const expectedResult = excludedLogLevels.includes(level) ? [] : args;
            expect(resultArgs).toEqual(expectedResult);
        }
    });
});
