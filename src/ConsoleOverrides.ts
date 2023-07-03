export const LOG_PIPE_TYPES = ['debug', 'error', 'info', 'log', 'trace', 'warn'] as const;
export type LogPipeType = typeof LOG_PIPE_TYPES[number];
export type LogPipe = (type: LogPipeType, ...args: any[]) => unknown[];

const consoleOverrides: Array<LogPipe> = [];

type ConsoleLogFn = (...args: any[]) => void;
const noop: ConsoleLogFn = () => {/* do nothing. */};

const originalConsole: Record<LogPipeType, ConsoleLogFn> = {
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
    for (const type of LOG_PIPE_TYPES) {
        originalConsole[type] = console[type] as ConsoleLogFn;
        console[type] = (...args: any[]): void => {
            let resultArgs = args;
            for (let i = consoleOverrides.length; --i >= 0;) {
                const pipe = consoleOverrides[i];
                resultArgs = pipe(type, ...resultArgs);
                if ((resultArgs?.length ?? 0) === 0) {
                    // Log is suppressed.
                    return;
                }
            }
            originalConsole[type](...resultArgs);
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
    for (const name of LOG_PIPE_TYPES) {
        console[name] = originalConsole[name];
        originalConsole[name] = noop;
    }
}
