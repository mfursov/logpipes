import {describe, expect, it} from '@jest/globals';
import {installLogPipe, LOG_LEVEL, LogPipe, LogLevel, uninstallLogPipe} from '../src';

describe('LogPipes', () => {

    it('should install and uninstall log pipes to console methods', () => {
        let lastCalledPipeType: LogLevel | undefined = undefined;
        let lastCalledPipeArg: unknown[] | undefined = undefined;
        const pipe: LogPipe = (type, ...args) => {
            lastCalledPipeType = type;
            lastCalledPipeArg = args;
            return [];
        };
        const originalConsole: Record<LogLevel, unknown> = {...console};
        installLogPipe(pipe);
        for (const type of LOG_LEVEL) {
            expect(console[type]).not.toBe(originalConsole[type]);
        }
        for (const type of LOG_LEVEL) {
            const arg = `Hello ${type}`;
            console[type](arg);
            expect(lastCalledPipeType).toBe(type);
            expect(lastCalledPipeArg).toEqual([arg]);
        }
        uninstallLogPipe(pipe);
        const restoredConsole: Record<LogLevel, unknown> = {...console};
        expect(restoredConsole).toEqual(originalConsole);
    });
});
