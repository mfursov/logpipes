export const LOG_LEVELS = ['debug', 'error', 'info', 'log', 'trace', 'warn'] as const;
export type LogLevel = typeof LOG_LEVELS[number];

export type LogPipeResult = unknown[] | { level: LogLevel, args: unknown[] };

export interface LogPipe<ResultType extends LogPipeResult = LogPipeResult> {
    /**
     * LogPipe is a functional interface that accepts a LogLevel and
     * a list of arguments and transforms it into another list of arguments.
     * The return is an array of transformed arguments.
     * If the log pipe needs to change the log level, it should return an object with an updated `level` field.
     */
    (level: LogLevel, ...args: unknown[]): ResultType;

    onInstall?: () => void;
    onUninstall?: () => void;
}

const consoleOverrides: Array<LogPipe> = [];

type ConsoleLogFn = (...args: unknown[]) => void;
const noop: ConsoleLogFn = () => {/* do nothing. */
};

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
    const pipes = Array.isArray(pipe) ? pipe : [pipe];
    installConsoleOverrides(...pipes);
}

/**
 *  Adds the pipes to the list of active console overrides.
 *  The pipes are called in the order they are installed.
 */
export function installConsoleOverrides(...pipes: Array<LogPipe>): void {
    initializeConsoleOverrideContextOnFirstUse();
    for (const pipe of pipes) {
        // Call pipe.onInstall() when pipe is installed first time.
        if (!consoleOverrides.includes(pipe) && pipe.onInstall) {
            pipe.onInstall();
        }
        consoleOverrides.push(pipe);
    }
}

/** Removes the given pipe from the active console overrides. */
export function uninstallConsoleOverride(pipe: LogPipe | Array<LogPipe>): void {
    const pipes = Array.isArray(pipe) ? pipe : [pipe];
    uninstallConsoleOverrides(...pipes);
}

/** Removes the given pipes from the active console overrides. */
export function uninstallConsoleOverrides(...pipes: Array<LogPipe>): void {
    for (const pipe of pipes) {
        for (let pipeIndex = consoleOverrides.indexOf(pipe); pipeIndex >= 0; pipeIndex = consoleOverrides.indexOf(pipe)) {
            const removedPipe = consoleOverrides.splice(pipeIndex, 1)[0];
            // Call pipe.onUninstall() when the pipe is not present in the overrides anymore.
            if (!consoleOverrides.includes(removedPipe) && removedPipe.onUninstall) {
                removedPipe.onUninstall();
            }
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

/**
 * Returns set of console.[log] methods captured during installation of the first pipe.
 * If no pipe is installed, returns current console[log] methods.
 */
export function getOriginalConsoleMethods(): Record<LogLevel, ConsoleLogFn> {
    if (originalConsole['debug'] !== noop) {
        return {...originalConsole};
    }
    const result = {} as Record<LogLevel, ConsoleLogFn>;
    for (const level of LOG_LEVELS) {
        result[level] = console[level] as ConsoleLogFn;
    }
    return result;
}

function initializeConsoleOverrideContextOnFirstUse(): void {
    if (originalConsole['debug'] !== noop) {
        return; // Already installed.
    }
    for (const level of LOG_LEVELS) {
        originalConsole[level] = console[level] as ConsoleLogFn;
        console[level] = (...args: unknown[]): void => {
            let resultLevel = level;
            let resultArgs = args;
            for (const pipe of consoleOverrides) {
                const logPipeResult = pipe(resultLevel, ...resultArgs);
                const isSuppressed = !logPipeResult
                    || (Array.isArray(logPipeResult)
                        ? (logPipeResult?.length ?? 0) === 0
                        : (logPipeResult.args?.length ?? 0) === 0);
                if (isSuppressed) {
                    return; // Log is suppressed.
                }
                if (Array.isArray(logPipeResult)) {
                    resultArgs = logPipeResult;
                    continue;
                }
                resultLevel = logPipeResult.level;
                resultArgs = logPipeResult.args;
            }
            originalConsole[resultLevel](...resultArgs);
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
