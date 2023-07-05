import {afterEach, describe, expect, it} from '@jest/globals';
import {
    getConsoleOverrides,
    installConsoleOverride,
    LOG_LEVELS,
    LogLevel,
    LogPipe,
    uninstallAllConsoleOverrides,
    uninstallConsoleOverride
} from '../src';

describe('ConsoleOverrides', () => {

    afterEach(() => {
        uninstallAllConsoleOverrides();
        expect(getConsoleOverrides()).toEqual([]);
    });

    it('should install and uninstall log pipes to console methods', () => {
        let lastCalledPipeType: LogLevel | undefined = undefined;
        let lastCalledPipeArg: unknown[] | undefined = undefined;
        const pipe: LogPipe = (type, ...args) => {
            lastCalledPipeType = type;
            lastCalledPipeArg = args;
            return [];
        };
        const originalConsole: Record<LogLevel, unknown> = {...console};
        installConsoleOverride(pipe);
        for (const type of LOG_LEVELS) {
            expect(console[type]).not.toBe(originalConsole[type]);
        }
        for (const type of LOG_LEVELS) {
            const arg = `Hello ${type}`;
            console[type](arg);
            expect(lastCalledPipeType).toBe(type);
            expect(lastCalledPipeArg).toEqual([arg]);
        }
        uninstallConsoleOverride(pipe);
        const restoredConsole: Record<LogLevel, unknown> = {...console};
        expect(restoredConsole).toEqual(originalConsole);
    });

    it('calls pipe in the expected order', () => {
        const pipe1: LogPipe = (_, ...args) => [...args].map(arg => `A${arg}`);
        const pipe2: LogPipe = (_, ...args) => [...args].map(arg => `B${arg}`);
        let checkIsDone = false;
        const checkingPipe: LogPipe = (level, ...args) => {
            expect(level).toBe('info');
            expect(args.length).toBe(3);
            for (const arg of args) {
                expect(arg.substring(0, 2)).toBe('BA');
            }
            checkIsDone = true;
            return [];
        };
        installConsoleOverride(pipe1);
        installConsoleOverride(pipe2);
        installConsoleOverride(checkingPipe);
        console.info('some text', 2, true);
        expect(checkIsDone).toBe(true);
    });

    it('can suppress log by returning an empty array', () => {
        let lastCalledPipe = '';
        const suppressingPipe: LogPipe = () => {
            lastCalledPipe = 'suppressing';
            return [];
        };
        const checkingPipe: LogPipe = () => {
            lastCalledPipe = 'checking';
            return [];
        };
        installConsoleOverride([suppressingPipe, checkingPipe]);
        console.log('Ping!');
        expect(lastCalledPipe).toBe('suppressing');
    });

    it('a pipe can be uninstalled', () => {
        const pipe1: LogPipe = (_, ...args) => [...args].map(arg => `A${arg}`);
        const pipe2: LogPipe = (_, ...args) => [...args].map(arg => `B${arg}`);
        const pipe3: LogPipe = (_, ...args) => [...args].map(arg => `C${arg}`);
        let message = '';
        const checkingPipe: LogPipe = (level, ...args) => {
            expect(level).toBe('warn');
            expect(args.length).toBe(1);
            message = args[0];
            return [];
        };
        installConsoleOverride([pipe1, pipe2, pipe3, checkingPipe]);
        expect(getConsoleOverrides()).toEqual([pipe1, pipe2, pipe3, checkingPipe]);
        console.warn('$');
        expect(message).toBe('CBA$');

        uninstallConsoleOverride(pipe2);
        expect(getConsoleOverrides()).toEqual([pipe1, pipe3, checkingPipe]);
        console.warn('$');
        expect(message).toBe('CA$');
    });

    it('all pipes can be uninstalled with uninstallAllConsoleOverrides', () => {
        const originalConsoleLog = console.log;
        const pipe: LogPipe = () => [];

        installConsoleOverride([pipe, pipe, pipe]);
        expect(getConsoleOverrides()).toEqual([pipe, pipe, pipe]);
        expect(console.log).not.toBe(originalConsoleLog);

        uninstallAllConsoleOverrides();
        expect(getConsoleOverrides()).toEqual([]);
        expect(console.log).toBe(originalConsoleLog);
    });

    it('uninstall methods have no effect on non-existing pipe', () => {
        uninstallConsoleOverride(() => []);
        uninstallAllConsoleOverrides();
    });
});
