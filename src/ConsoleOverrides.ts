export const LOG_LEVEL = ['debug', 'error', 'info', 'log', 'trace', 'warn'] as const;
export type LogLevel = typeof LOG_LEVEL[number];
export type LogPipe = (type: LogLevel, ...args: any[]) => unknown[];

const consoleOverrides: Array<LogPipe> = [];

type ConsoleLogFn = (...args: any[]) => void;
const noop: ConsoleLogFn = () => {/* do nothing. */};

const originalConsole: Record<LogLevel, ConsoleLogFn> = {
    debug: noop,
    error: noop,
    info: noop,
    log: noop,
    trace: noop,
    warn: noop
};

export function installLogPipe(pipe: LogPipe): void {
    overrideConsoleMethodsOnFirstPipe();
    consoleOverrides.push(pipe);
}

export function uninstallLogPipe(pipe: LogPipe): void {
    const pipeIndex = consoleOverrides.lastIndexOf(pipe);
    if (pipeIndex === -1) {
        throw new Error('Must be a top-level logger.');
    }
    consoleOverrides.splice(pipeIndex, 1);
    restoreOriginalConsoleMethodsOnLastPipe();
}

function overrideConsoleMethodsOnFirstPipe(): void {
    if (originalConsole['debug'] !== noop) {
        return;
    }
    for (const level of LOG_LEVEL) {
        originalConsole[level] = console[level] as ConsoleLogFn;
        console[level] = (...args: any[]): void => {
            let resultArgs = args;
            for (let i = consoleOverrides.length; --i >= 0;) {
                const pipe = consoleOverrides[i];
                resultArgs = pipe(level, ...resultArgs);
                if ((resultArgs?.length ?? 0) === 0) {
                    // Log is suppressed.
                    return;
                }
            }
            originalConsole[level](...resultArgs);
        };
    }
}

function restoreOriginalConsoleMethodsOnLastPipe(): void {
    if (consoleOverrides.length > 0) {
        return;
    }
    if (originalConsole['debug'] === noop) {
        throw new Error('No cached console methods to restore');
    }
    for (const name of LOG_LEVEL) {
        console[name] = originalConsole[name];
        originalConsole[name] = noop;
    }
}
