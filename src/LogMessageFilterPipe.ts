import {LogPipe} from './ConsoleOverrides';

/** Options for createLogMessageFilterPipe. */
export interface LogMessageFilterPipeOptions {
    /**
     * List of tokens that make the whole console log event ignored
     * if any of the tokens is found in any of top level args.
     */
    excludedMessageTokens: Array<string | RegExp>;

    /**
     * If `false` all string tokens are matched using a case-insensitive (toLowerCase()) comparison.
     * Default is `false`.
     */
    isCaseSensitive: boolean;
}

/** Returns default LogMessageFilterPipeOptions. */
export function getLogMessageFilterPipeOptions(): LogMessageFilterPipeOptions {
    return {
        isCaseSensitive: false,
        excludedMessageTokens: [],
    };
}

/** Creates a new instance of LogMessageFilterPipe. */
export function createLogMessageFilterPipe(
    inputOptions: Partial<LogMessageFilterPipeOptions> & Pick<LogMessageFilterPipeOptions, 'excludedMessageTokens'>
): LogPipe {
    const {excludedMessageTokens, isCaseSensitive} = {...getLogMessageFilterPipeOptions(), ...inputOptions};
    const stringTokens = (excludedMessageTokens.filter(t => typeof t === 'string') as string[]).map(t => isCaseSensitive ? t : t.toLowerCase());
    const regexTokens = excludedMessageTokens.filter(t => typeof t === 'object') as Array<RegExp>;
    // Move strings first in the list.
    excludedMessageTokens.sort((t1, t2) => typeof t1 === typeof t2 ? 0 : typeof t1 === 'string' ? -1 : 1);
    return (_, ...args) => {
        if (excludedMessageTokens.length === 0) {
            return args;
        }
        if (isCaseSensitive) {
            for (const arg of args) {
                if (typeof arg === 'string') {
                    if (stringTokens.some(token => arg.includes(token))) {
                        return [];
                    }
                    if (regexTokens.some(t => t.test(arg))) {
                        return [];
                    }
                }
            }
        } else { // Case-insensitive.
            for (const arg of args) {
                if (typeof arg === 'string') {
                    const lcArg = arg.toLowerCase();
                    if (stringTokens.some(lcToken => lcArg.includes(lcToken))) {
                        return [];
                    }
                    if (regexTokens.some(t => t.test(arg))) {
                        return [];
                    }
                }

            }
        }
        return args;
    };
}
