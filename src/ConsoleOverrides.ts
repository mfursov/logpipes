export const LOG_LEVELS = ['debug', 'error', 'info', 'log', 'trace', 'warn'] as const;
export type LogLevel = typeof LOG_LEVELS[number];
export type LogPipe = (level: LogLevel, ...args: any[]) => unknown[];

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

/**
 *  Adds the pipe to the list of active console overrides.
 *  The pipes are called in the order they are installed.
 */
export function installConsoleOverride(pipe: LogPipe | Array<LogPipe>): void {
    initializeConsoleOverrideContextOnFirstUse();
    const pipes = Array.isArray(pipe) ? pipe : [pipe];
    consoleOverrides.push(...pipes);
}

/** Removes the given pipe from the active console overrides. */
export function uninstallConsoleOverride(pipe: LogPipe | Array<LogPipe>): void {
    const pipes = Array.isArray(pipe) ? pipe : [pipe];
    for (const pipe of pipes) {
        for (let pipeIndex = consoleOverrides.indexOf(pipe); pipeIndex >= 0; pipeIndex = consoleOverrides.indexOf(pipe)) {
            consoleOverrides.splice(pipeIndex, 1);
        }
    }
    destroyConsoleOverrideContextOnLastUse();
}

/** Uninstall all existing console overrides. */
export function uninstallAllConsoleOverrides(): void {
    for (const pipe of [...consoleOverrides]) {
        uninstallConsoleOverride(pipe);
    }
}

/** Returns a list of all console overrides. */
export function getConsoleOverrides(): Array<LogPipe> {
    return [...consoleOverrides];
}

function initializeConsoleOverrideContextOnFirstUse(): void {
    if (originalConsole['debug'] !== noop) {
        return; // Already installed.
    }
    for (const level of LOG_LEVELS) {
        originalConsole[level] = console[level] as ConsoleLogFn;
        console[level] = (...args: any[]): void => {
            let resultArgs = args;
            for (const pipe of consoleOverrides) {
                resultArgs = pipe(level, ...resultArgs);
                if ((resultArgs?.length ?? 0) === 0) {
                    return; // Log is suppressed.
                }
            }
            originalConsole[level](...resultArgs);
        };
    }
}

function destroyConsoleOverrideContextOnLastUse(): void {
    if (consoleOverrides.length > 0) {
        return; // Too early to restore: there are overrides.
    }
    if (originalConsole['debug'] === noop) {
        return; // Nothing to restore: not overridden.
    }
    for (const name of LOG_LEVELS) {
        console[name] = originalConsole[name];
        originalConsole[name] = noop;
    }
}
