import {LogLevel, LogPipe} from './ConsoleOverrides';

/**
 * Creates a log pipe that does nothing.
 * Used to reduce boilerplate in client's code.
 */
export function createNoopPipe(): LogPipe {
    return (_: LogLevel, ...args: Array<unknown>): Array<unknown> => args;
}
