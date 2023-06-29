import {LogPipe} from './stack';

export const jsonPipe: LogPipe = (_, ...args) => {
    const result: Record<string, unknown> = {};
    let message: string | undefined = undefined;
    for (const arg of args) {
        if (typeof arg === 'string') {
            message = (message === undefined) ? arg : message + arg;
        }
    }
    return [JSON.stringify(result)];
};
