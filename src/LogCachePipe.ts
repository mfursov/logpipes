import {LogLevel, LogPipe} from './ConsoleOverrides';
import {simplifyJson} from './JsonSimplifier';

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
     * Once the limit is reached and a new message arrives, 'onCacheSizeReached' is called and
     * the oldest message is removed from the cache.
     *
     * Default: 1000.
     */
    cacheSize: number;

    /**
     * How much data to keep in the cache using 'sum(stringify(...args))' formula.
     * Once the limit is reached and a new message arrives, onCacheSizeReached is called and a set of the oldest
     * messages are removed from the cache to keep the cache size within the limit.
     * The size estimator is optimized for string message parameters (for example, a stringifies JSON messages).
     *
     * Default: not used (-1).
     */
    cacheSizeByStringify: number;

    /**
     * A callback to notify about cache overflow.
     * Called every time the cache is full: count of messages is > cacheSize or 'cacheSizeByStringify' is met.
     *
     * A callee can use 'getMessages' or 'clearMessages' inside the callback to access the current cache state.
     * It is recommended to clear all messages in the callback to avoid callback calls on every new console log event.
     * Default: undefined, no action.
     *
     * Warning: avoid calling console.log from inside 'onCacheSizeReached'.
     * If console log method is called from 'onCacheSizeReached' the pipe will ignore these messages.
     * In order to avoid this problem and still be able to use console in methods called from 'onCacheSizeReached',
     * wrap the code that logs to console into an asynchronous task like a 'setTimeout()' call.
     *
     * Default: undefined.
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

export function getDefaultLogCachePipeOptions(): LogCachePipeOptions {
    return {
        /** Keeps only 1000 messages in the cache by default. */
        cacheSize: 1000,

        /** Do not use estimation by data size by default. */
        cacheSizeByStringify: -1,
    };
}

interface LinkedListNode<T> {
    value: T;
    next?: LinkedListNode<T>;
}

export function createLogCachePipe(inputOptions: Partial<LogCachePipeOptions> = {}): LogCachePipe {
    const options = {...getDefaultLogCachePipeOptions(), ...inputOptions};
    if (options.cacheSize < 0 || isNaN(options.cacheSize)) {
        throw new Error(`Invalid cache size: ${options.cacheSize}`);
    }
    const cache: {
        first?: LinkedListNode<LogCachePipeMessage>,
        last?: LinkedListNode<LogCachePipeMessage>,
        size: number,
    } = {size: 0};
    let isInsideOnCacheSizeReachedCall = false;
    let currentCacheSizeByStringify = 0;

    function removeFirstMessageFromCache(): void {
        if (cache.first) {
            if (currentCacheSizeByStringify > 0) {
                currentCacheSizeByStringify -= estimateArgsSizeByStringify(...cache.first.value.args);
            }
            cache.first = cache.first.next;
            cache.size--;
        }
    }

    function addNewMessageToCache(newMessageNode: LinkedListNode<LogCachePipeMessage>): void {
        if (cache.last === undefined) {
            cache.first = newMessageNode;
        } else {
            cache.last.next = newMessageNode;
        }
        cache.last = newMessageNode;
        cache.size++;
        if (options.cacheSizeByStringify >= 0) {
            currentCacheSizeByStringify += estimateArgsSizeByStringify(...newMessageNode.value.args);
        }
    }

    const pipe: LogPipe = (level, ...args) => {
        if (options.cacheSize === 0 || isInsideOnCacheSizeReachedCall) {
            return args;
        }
        const newMessageNode: LinkedListNode<LogCachePipeMessage> = {value: {level, args, timestamp: Date.now()}};
        addNewMessageToCache(newMessageNode);

        const isCacheSizeLimitReached = cache.size > options.cacheSize;
        const isStringifyLimitReached = options.cacheSizeByStringify >= 0 && currentCacheSizeByStringify > options.cacheSizeByStringify;
        if (isCacheSizeLimitReached || isStringifyLimitReached) {
            if (options.onCacheSizeReached) {
                isInsideOnCacheSizeReachedCall = true;
                try {
                    options.onCacheSizeReached(cachePipe);
                } finally {
                    isInsideOnCacheSizeReachedCall = false;
                }
            }
        }
        if (isStringifyLimitReached) {
            while (currentCacheSizeByStringify > options.cacheSizeByStringify && cache.first !== undefined) {
                removeFirstMessageFromCache();
            }
            // Do some state recovery to keep 'currentCacheSizeByStringify' within meaningful ranges.
            // This may happen if messages in the cache are modified by user and sizes change.
            currentCacheSizeByStringify = Math.max(currentCacheSizeByStringify, 0);
            if (cache.first === undefined) {
                currentCacheSizeByStringify = 0;
            }
        } else if (isCacheSizeLimitReached) {
            removeFirstMessageFromCache();
        }
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
        currentCacheSizeByStringify = 0;
    };
    cachePipe.onInstall = (): void => cachePipe.clearMessages();
    return cachePipe;
}

/** Estimates args array size using simplifyJson call. */
export function estimateArgsSizeByStringify(...args: Array<unknown>): number {
    let size = 0;
    for (const arg of args) {
        if (arg !== undefined) {
            size += JSON.stringify(simplifyJson(arg)).length;
        }
    }
    return size;
}
