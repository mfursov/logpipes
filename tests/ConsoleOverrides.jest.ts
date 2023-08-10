import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';
import {
    getConsoleOverrides,
    getOriginalConsoleMethods,
    installConsoleOverride,
    installConsoleOverrides,
    LOG_LEVELS,
    LogLevel,
    LogPipe,
    uninstallAllConsoleOverrides,
    uninstallConsoleOverride,
    uninstallConsoleOverrides
} from '../src';

describe('ConsoleOverrides', () => {

    afterEach(() => {
        uninstallAllConsoleOverrides();
        expect(getConsoleOverrides()).toEqual([]);
    });

    it('should install and uninstall log pipes to console methods', () => {
        let lastCalledPipeLevel: LogLevel | undefined = undefined;
        let lastCalledPipeArg: unknown[] | undefined = undefined;
        const pipe: LogPipe = (level, ...args) => {
            lastCalledPipeLevel = level;
            lastCalledPipeArg = args;
            return [];
        };
        const originalConsole: Record<LogLevel, unknown> = {...console};
        installConsoleOverrides(pipe);
        for (const level of LOG_LEVELS) {
            expect(console[level]).not.toBe(originalConsole[level]);
        }
        for (const level of LOG_LEVELS) {
            const arg = `Hello ${level}`;
            console[level](arg);
            expect(lastCalledPipeLevel).toBe(level);
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
        installConsoleOverrides(pipe1);
        installConsoleOverrides(pipe2);
        installConsoleOverrides(checkingPipe);
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
        installConsoleOverrides(suppressingPipe, checkingPipe);
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
        installConsoleOverrides(pipe1, pipe2, pipe3, checkingPipe);
        expect(getConsoleOverrides()).toEqual([pipe1, pipe2, pipe3, checkingPipe]);
        console.warn('$');
        expect(message).toBe('CBA$');

        uninstallConsoleOverrides(pipe2);
        expect(getConsoleOverrides()).toEqual([pipe1, pipe3, checkingPipe]);
        console.warn('$');
        expect(message).toBe('CA$');
    });

    it('all pipes can be uninstalled with uninstallAllConsoleOverrides', () => {
        const originalConsoleLog = console.log;
        const pipe: LogPipe = () => [];

        installConsoleOverrides(pipe, pipe, pipe);
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

    describe('install and uninstall', () => {
        let installCount = 0;
        let uninstallCount = 0;
        const pipe: LogPipe = () => [];
        pipe.onInstall = (): void => {installCount++;};
        pipe.onUninstall = (): void => {uninstallCount++;};

        beforeEach(() => {
            installCount = 0;
            uninstallCount = 0;
        });

        it('runs install and uninstall on pipes', () => {
            installConsoleOverrides(pipe);
            expect(installCount).toBe(1);
            expect(uninstallCount).toBe(0);

            uninstallConsoleOverrides(pipe);
            expect(installCount).toBe(1);
            expect(uninstallCount).toBe(1);
        });

        it('call install and uninstall only once', () => {
            installConsoleOverride([pipe, pipe]);
            expect(installCount).toBe(1);
            expect(uninstallCount).toBe(0);

            uninstallAllConsoleOverrides();
            expect(installCount).toBe(1);
            expect(uninstallCount).toBe(1);
        });

        it('allows to reinstall pipes', () => {
            installConsoleOverride(pipe);
            expect(installCount).toBe(1);
            expect(uninstallCount).toBe(0);

            uninstallConsoleOverride(pipe);
            expect(installCount).toBe(1);
            expect(uninstallCount).toBe(1);

            installConsoleOverride(pipe);
            expect(installCount).toBe(2);
            expect(uninstallCount).toBe(1);
        });

        it('supports log level switch', () => {
            const switchedLogLevel: LogLevel = 'debug';
            let tracedLogLevel: LogLevel | undefined;
            let tracedArgs: unknown[] | undefined;
            const logLevelSwitchPipe: LogPipe = (_, ...args) => ({level: switchedLogLevel, args});
            const logLevelTracePipe: LogPipe = (level, ...args) => {
                tracedLogLevel = level;
                tracedArgs = args;
                return args;
            };
            installConsoleOverride([logLevelSwitchPipe, logLevelTracePipe, (): unknown[] => []]);
            for (const level of LOG_LEVELS) {
                tracedLogLevel = undefined;
                console[level]('Hello', 'World');
                expect(tracedLogLevel).toBe(switchedLogLevel);
                expect(tracedArgs).toEqual(['Hello', 'World']);
            }
        });
    });

    describe('getOriginalConsoleMethods', () => {
        function captureConsoleMethods(): Record<LogLevel, unknown> {
            return LOG_LEVELS.reduce((r, level) => {
                r[level] = console[level];
                return r;
            }, {} as Record<LogLevel, unknown>);
        }

        const originalMethods = captureConsoleMethods();

        it('returns original console methods if no pipe is installed', () => {
            const result = getOriginalConsoleMethods();
            expect(result).toEqual(originalMethods);
        });

        it('returns original console methods if pipe is installed', () => {
            installConsoleOverride((_, args) => args);
            for (const level of LOG_LEVELS) {
                expect(console[level]).not.toBe(originalMethods[level]);
            }
            const result = getOriginalConsoleMethods();
            expect(result).toEqual(originalMethods);
        });
    });
});
