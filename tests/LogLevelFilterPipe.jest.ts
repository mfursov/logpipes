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

    it('filters messages when a log level is provided', () => {
        const excludedLogLevels: Array<LogLevel> = ['debug', 'trace'];
        const pipe = createLogLevelFilterPipe({excludedLogLevels});
        const args = [1, true, {}, ''];
        for (const level of LOG_LEVELS) {
            const resultArgs = pipe(level, ...args);
            const expectedResult = excludedLogLevels.includes(level) ? [] : args;
            expect(resultArgs).toEqual(expectedResult);
        }
    });

    it('filters messages when a log level is provided as a function that returns array', () => {
        const excludedLevels: Array<LogLevel> = ['debug', 'trace'];
        const excludedLogLevels: () => Array<LogLevel> = () => excludedLevels;
        const pipe = createLogLevelFilterPipe({excludedLogLevels});
        const args = [1, true, {}, ''];
        for (const level of LOG_LEVELS) {
            const resultArgs = pipe(level, ...args);
            const expectedResult = excludedLevels.includes(level) ? [] : args;
            expect(resultArgs).toEqual(expectedResult);
        }
    });

    it('filters messages when a log level is provided as a function that returns boolean', () => {
        const excludedLogLevels: (level: LogLevel) => boolean = (level: LogLevel) => level === 'debug';
        const pipe = createLogLevelFilterPipe({excludedLogLevels});
        const args = [1, true, {}, ''];
        for (const level of LOG_LEVELS) {
            const resultArgs = pipe(level, ...args);
            const expectedResult = level === 'debug' ? [] : args;
            expect(resultArgs).toEqual(expectedResult);
        }
    });
});
