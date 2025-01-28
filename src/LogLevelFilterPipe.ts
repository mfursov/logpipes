import {LogLevel, LogPipe} from './ConsoleOverrides';

/** Options for createLogLevelFilterPipe. */
export interface LogLevelFilterPipeOptions {
    /**
     * List of excluded log levels.
     * Messages sent to the excluded log level won't be passed to console.log methods.
     */
    excludedLogLevels: Array<LogLevel> | (() => Array<LogLevel>);
}

/** Creates a new instance of LogLevelFilterPipe. */
export function createLogLevelFilterPipe(inputOptions: Partial<LogLevelFilterPipeOptions> = {}): LogPipe {
    const options = {excludedLogLevels: [], ...inputOptions};
    return (level, ...args) => {
        const excludedLogLevels = typeof options.excludedLogLevels === 'function'
            ? options.excludedLogLevels()
            : options.excludedLogLevels;
        return excludedLogLevels.includes(level) ? [] : args;
    };
}
