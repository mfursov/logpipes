import {describe, expect, it} from '@jest/globals';
import {createLogCachePipe, estimateArgsSizeByStringify, LogCachePipeMessage} from '../src';

describe('LogCachePipe', () => {

    it('caches cacheSize messages', () => {
        const pipe = createLogCachePipe({cacheSize: 2});

        pipe('trace', {m: 1});
        expect(pipe.getMessages().length).toBe(1);

        pipe('debug', {m: 2});
        expect(pipe.getMessages().length).toBe(2);

        pipe('error', {m: 3});
        let messages = pipe.getMessages();
        resetTimestamps(messages);
        expect(messages).toEqual([
            {level: 'debug', timestamp: 0, args: [{m: 2}]},
            {level: 'error', timestamp: 0, args: [{m: 3}]},
        ]);

        pipe('info', {m: 4});
        messages = pipe.getMessages();
        resetTimestamps(messages);
        expect(messages).toEqual([
            {level: 'error', timestamp: 0, args: [{m: 3}]},
            {level: 'info', timestamp: 0, args: [{m: 4}]},
        ]);
    });

    it('clears cache on re-install', () => {
        const pipe = createLogCachePipe({cacheSize: 2});
        pipe('trace', {m: 1});
        pipe('debug', {m: 2});
        expect(pipe.getMessages().length).toBe(2);
        expect(pipe.onInstall).toBeDefined();
        pipe.onInstall!(); // eslint-disable-line  @typescript-eslint/no-non-null-assertion
        expect(pipe.getMessages().length).toBe(0);
    });

    it('calls onCacheSizeReached before overflow', () => {
        let onCacheSizeReachedCallCount = 0;
        const pipe = createLogCachePipe({
            cacheSize: 2,
            onCacheSizeReached: p => {
                const messages = p.getMessages();
                resetTimestamps(messages);
                expect(messages).toEqual([
                    {level: 'trace', timestamp: 0, args: [{m: 1}]},
                    {level: 'debug', timestamp: 0, args: [{m: 2}]},
                    {level: 'error', timestamp: 0, args: [{m: 3}]},
                ]);
                onCacheSizeReachedCallCount++;
            },
        });
        pipe('trace', {m: 1});
        pipe('debug', {m: 2});
        pipe('error', {m: 3});
        expect(onCacheSizeReachedCallCount).toBe(1);
        const messages = pipe.getMessages();
        resetTimestamps(messages);
        expect(messages).toEqual([
            {level: 'debug', timestamp: 0, args: [{m: 2}]},
            {level: 'error', timestamp: 0, args: [{m: 3}]},
        ]);
    });

    it('supports clearMessages', () => {
        const pipe = createLogCachePipe({cacheSize: 10});
        pipe('trace', {m: 1});
        pipe('debug', {m: 2});
        pipe('error', {m: 3});
        expect(pipe.getMessages().length).toBe(3);

        pipe.clearMessages();
        expect(pipe.getMessages().length).toBe(0);

        pipe('trace', {m: 1});
        pipe('debug', {m: 2});
        pipe('error', {m: 3});
        expect(pipe.getMessages().length).toBe(3);
    });

    it('supports clearMessages from onCacheSizeReached', () => {
        const pipe = createLogCachePipe({
            cacheSize: 2,
            onCacheSizeReached: p => p.clearMessages(),
        });
        pipe('trace', {m: 1});
        pipe('debug', {m: 2});
        pipe('error', {m: 3});
        const messages = pipe.getMessages();
        resetTimestamps(messages);
        expect(messages).toEqual([]);
    });

    it('does not allow bad cache size value', () => {
        expect(() => createLogCachePipe({cacheSize: -1})).toThrow();
        expect(() => createLogCachePipe({cacheSize: NaN})).toThrow();
        expect(() => createLogCachePipe({cacheSize: -Infinity})).toThrow();
        expect(() => createLogCachePipe({cacheSize: Infinity})).not.toThrow();
        expect(() => createLogCachePipe({cacheSize: 0})).not.toThrow();
    });

    it('allows cacheSize to be 0', () => {
        let onCacheSizeReachedCallCount = 0;
        const pipe = createLogCachePipe({
            cacheSize: 0,
            onCacheSizeReached: () => onCacheSizeReachedCallCount++,
        });
        pipe('trace', {m: 1});
        expect(pipe.getMessages().length).toBe(0);
        expect(onCacheSizeReachedCallCount).toBe(0); // Not called with the empty state.
    });

    it('does not call onCacheSizeReached recursively', () => {
        let onCacheSizeReachedCallCount = 0;
        const pipe = createLogCachePipe({
            cacheSize: 2,
            onCacheSizeReached: () => {
                onCacheSizeReachedCallCount++;
                pipe('info', {m: 4}); // Will be ignored by the pipe.
            },
        });
        pipe('info', {m: 1});
        pipe('info', {m: 2});
        pipe('info', {m: 3}); // Overflow.
        expect(onCacheSizeReachedCallCount).toBe(1);
        const messages = pipe.getMessages();
        resetTimestamps(messages);
        expect(messages).toEqual([
            {level: 'info', timestamp: 0, args: [{m: 2}]},
            {level: 'info', timestamp: 0, args: [{m: 3}]},
        ]);
    });

    it('adds correct timestamp to messages', () => {
        const pipe = createLogCachePipe();

        const before = Date.now();
        pipe('log', 'hello');
        const after = Date.now();

        const messages = pipe.getMessages();
        expect(messages.length).toBe(1);
        expect(messages[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(messages[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('does not allow data overflow when cacheSizeByStringify is used', () => {
        const pipe = createLogCachePipe({cacheSizeByStringify: 3});
        pipe('log', '1'); // Adds +3.
        expect(pipe.getMessages().length).toBe(1);
        pipe('log', '1'); // Adds +3.
        expect(pipe.getMessages().length).toBe(1); // The first message was dropped.
        pipe('log', '1000'); // Adds +6.
        expect(pipe.getMessages().length).toBe(0); // Even 1 message is too big for the cache.
    });

    it(`calls onCacheSizeReached when cacheSizeByStringify limit is reached before the cleanup`, () => {
        let onCacheSizeReachedCallCount = 0;
        let expectedMessages: Array<LogCachePipeMessage> = [];
        const pipe = createLogCachePipe({
            cacheSizeByStringify: 3,
            onCacheSizeReached: p => {
                const messages = p.getMessages();
                resetTimestamps(messages);
                expect(messages).toEqual(expectedMessages);
                onCacheSizeReachedCallCount++;
            },
        });
        pipe('log', '1'); // Adds +3.
        expect(onCacheSizeReachedCallCount).toBe(0);

        expectedMessages = [
            {level: 'log', timestamp: 0, args: ['1']},
            {level: 'log', timestamp: 0, args: ['2']}
        ];
        pipe('log', '2'); // Adds +3.
        expect(onCacheSizeReachedCallCount).toBe(1);


        expectedMessages = [
            {level: 'log', timestamp: 0, args: ['2']},
            {level: 'log', timestamp: 0, args: ['3']}
        ];
        pipe('log', '3'); // Adds +3.
        expect(onCacheSizeReachedCallCount).toBe(2);

        expect(pipe.getMessages()).toEqual([{level: 'log', timestamp: 0, args: ['3']}]);
    });
});

describe('estimateArgsSizeByStringify', () => {
    const f = estimateArgsSizeByStringify;
    it('handles undefined values', () => {
        expect(f()).toBe(0);
        expect(f(undefined)).toBe(0);
    });

    it('handles strings', () => {
        expect(f('12345')).toBe(7);
    });

    it('handles numbers', () => {
        expect(f(1)).toBe(1);
        expect(f(12)).toBe(2);
        expect(f(0.1)).toBe(3);
    });

    it('handles booleans', () => {
        expect(f(true)).toBe(4);
        expect(f(false)).toBe(5);
    });

    it('handles arrays', () => {
        expect(f([])).toBe(2);
        expect(f([1])).toBe(3);
        expect(f([1, 2, 3])).toBe(7);
    });

    it('handles objects', () => {
        expect(f({})).toBe(2);
        expect(f({foo: 1})).toBe(9);
        expect(f({foo: {boo: 1}})).toBe(17);
    });
});

function resetTimestamps(messages: Array<LogCachePipeMessage>, timestamp = 0): void {
    for (const m of messages) {
        expect(m.timestamp > 0);
        m.timestamp = timestamp;
    }
}
