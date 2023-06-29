import {describe, expect, it} from '@jest/globals';
import {installLogPipe, LOG_PIPE_TYPES, LogPipe, LogPipeType, uninstallLogPipe} from '../src';

describe('LogPipe', () => {

    it('should install and uninstall log pipes to console methods', () => {
        let lastCalledPipeType: LogPipeType | undefined = undefined;
        let lastCalledPipeArg: unknown[] | undefined = undefined;
        const pipe: LogPipe = (type, ...args) => {
            lastCalledPipeType = type;
            lastCalledPipeArg = args;
            return [];
        };
        const originalConsole: Record<LogPipeType, unknown> = {...console};
        installLogPipe(pipe);
        for (const type of LOG_PIPE_TYPES) {
            expect(console[type]).not.toBe(originalConsole[type]);
        }
        for (const type of LOG_PIPE_TYPES) {
            const arg = `Hello ${type}`;
            console[type](arg);
            expect(lastCalledPipeType).toBe(type);
            expect(lastCalledPipeArg).toEqual([arg]);
        }
        uninstallLogPipe(pipe);
        const restoredConsole: Record<LogPipeType, unknown> = {...console};
        expect(restoredConsole).toEqual(originalConsole);
    });
});
