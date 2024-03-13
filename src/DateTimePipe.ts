import {LogLevel, LogPipe} from './ConsoleOverrides';

export interface DateTimePipeOptions {
    dateFormatter: (timeMillis: number) => string;
}

export function getDefaultDateTimePipeOptions(): DateTimePipeOptions {
    return {
        dateFormatter: timeMillis => new Date(timeMillis).toISOString(),
    };
}

/**
 * Creates a log pipe that adds date and time prefix to console output.
 */
export function createDateTimePipe({dateFormatter}: DateTimePipeOptions = getDefaultDateTimePipeOptions()): LogPipe<unknown[]> {
    return (_: LogLevel, ...args: Array<unknown>): Array<unknown> => [dateFormatter(Date.now()), ...args];
}
