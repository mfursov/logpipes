import {LogLevel, LogPipe} from './ConsoleOverrides';

/**
 *  LogCachePipe caches up to 'cacheSize' messages,
 *  notifies about cache overflow using 'onCacheSizeReached'
 *  and provides access to the cache.
 */
export interface LogCachePipe extends LogPipe {
    /** Returns a list of all cached messages. */
    getMessages(): Array<LogCachePipeMessage>;

    /** Clears messages cache. */
    clearMessages(): void;
}

/** Options for 'createLogCachePipe'. */
export interface LogCachePipeOptions {
    /**
     * How many messages to keep in the cache.
     * Once the limit is reached and a new message arrives, the oldest message will be removed from the cache.
     * Default: 1000.
     */
    cacheSize: number;
    /**
     * Callback to notify about cache overflow.
     * Called every time the cache is full before a new message is added.
     * A callee can use 'getMessages' or 'clearMessages' inside the callback.
     * It is recommended to clear all messages in the callback to avoid callback calls on every new console log event.
     * Default: undefined, no action.
     *
     * Warning: avoid calling console.log from inside 'onCacheSizeReached'.
     * If console log method is called from 'onCacheSizeReached' the pipe will ignore these messages.
     * In order to avoid this problem and still be able to use console in methods called from 'onCacheSizeReached',
     * wrap the code that logs to console into an asynchronous task: a setTimeout() call.
     */
    onCacheSizeReached?: (pipe: LogCachePipe) => void;
}

/** A cached message model. */
export interface LogCachePipeMessage {
    level: LogLevel;
    /** Time the message was cached. */
    timestamp: number;
    args: unknown[];
}

export const DEFAULT_LOG_CACHE_PIPE_OPTIONS: LogCachePipeOptions = {
    /** Keeps only 1000 messages in the cache by default. */
    cacheSize: 1000,
};

interface LinkedListNode<T> {
    value: T;
    next?: LinkedListNode<T>;
}

export function createLogCachePipe(inputOptions: Partial<LogCachePipeOptions> = {}): LogCachePipe {
    const options = {...DEFAULT_LOG_CACHE_PIPE_OPTIONS, ...inputOptions};
    if (options.cacheSize < 0 || isNaN(options.cacheSize)) {
        throw new Error(`Invalid cache size: ${options.cacheSize}`);
    }
    const cache: {
        first?: LinkedListNode<LogCachePipeMessage>,
        last?: LinkedListNode<LogCachePipeMessage>,
        size: number,
    } = {size: 0};
    let isInsideOnCacheSizeReachedCall = false;
    const pipe: LogPipe = (level, ...args) => {
        if (options.cacheSize === 0 || isInsideOnCacheSizeReachedCall) {
            return args;
        }
        if (cache.size === options.cacheSize) {
            if (options.onCacheSizeReached) {
                isInsideOnCacheSizeReachedCall = true;
                try {
                    options.onCacheSizeReached(cachePipe);
                } finally {
                    isInsideOnCacheSizeReachedCall = false;
                }
            }
            if (cache.first) {
                cache.first = cache.first.next;
                cache.size--;
            }
        }
        const newMessageNode: LinkedListNode<LogCachePipeMessage> = {value: {level, args, timestamp: Date.now()}};
        if (cache.last === undefined) {
            cache.first = newMessageNode;
        } else {
            cache.last.next = newMessageNode;
        }
        cache.last = newMessageNode;
        cache.size++;
        return args;
    };
    const cachePipe = pipe as LogCachePipe;
    cachePipe.getMessages = (): Array<LogCachePipeMessage> => {
        const result: Array<LogCachePipeMessage> = [];
        let node = cache.first;
        while (node !== undefined) {
            result.push(node.value);
            node = node.next;
        }
        return result;
    };
    cachePipe.clearMessages = (): void => {
        cache.first = undefined;
        cache.last = undefined;
        cache.size = 0;
    };
    cachePipe.onInstall = (): void => cachePipe.clearMessages();
    return cachePipe;
}
