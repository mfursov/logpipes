import {describe, expect, it} from '@jest/globals';
import {createLogCachePipe} from '../src/LogCachePipe';

describe('LogCachePipe', () => {

    it('caches cacheSize messages', () => {
        const pipe = createLogCachePipe({cacheSize: 2});
        pipe('trace', {m: 1});
        pipe('debug', {m: 2});
        pipe('error', {m: 3});
        let messages = pipe.getMessages();
        expect(messages).toEqual([
            {level: 'debug', args: [{m: 2}]},
            {level: 'error', args: [{m: 3}]},
        ]);
        pipe('info', {m: 4});
        messages = pipe.getMessages();
        expect(messages).toEqual([
            {level: 'error', args: [{m: 3}]},
            {level: 'info', args: [{m: 4}]},
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
                expect(messages.length).toBe(2);
                expect(messages).toEqual([
                    {level: 'trace', args: [{m: 1}]},
                    {level: 'debug', args: [{m: 2}]},
                ]);
                onCacheSizeReachedCallCount++;
            },
        });
        pipe('trace', {m: 1});
        pipe('debug', {m: 2});
        pipe('error', {m: 3});
        expect(onCacheSizeReachedCallCount).toBe(1);
        const messages = pipe.getMessages();
        expect(messages).toEqual([
            {level: 'debug', args: [{m: 2}]},
            {level: 'error', args: [{m: 3}]},
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
        expect(messages).toEqual([{level: 'error', args: [{m: 3}]}]);
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
        expect(messages).toEqual([
            {level: 'info', args: [{m: 2}]},
            {level: 'info', args: [{m: 3}]},
        ]);
    });

});
