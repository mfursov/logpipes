import {describe, expect, it} from '@jest/globals';
import {createLogMessageFilterPipe} from '../src';

describe('LogMessageFilterPipe', () => {

    it('empty tokens result to no filtering', () => {
        const pipe = createLogMessageFilterPipe({excludedMessageTokens: []});
        expect(pipe('log', 'hello')).toEqual(['hello']);
        expect(pipe('log', 1, 2, 3)).toEqual([1, 2, 3]);
    });

    it('filters messages by string tokens', () => {
        const pipe = createLogMessageFilterPipe({excludedMessageTokens: ['hello']});
        expect(pipe('log', 'hello')).toEqual([]);
        expect(pipe('log', 'hello2')).toEqual([]);
        expect(pipe('log', '2hello')).toEqual([]);
        expect(pipe('log', 'HELLO')).toEqual([]);
        expect(pipe('log', 'HELLO2')).toEqual([]);
        expect(pipe('log', 'HEllO2')).toEqual([]);
    });

    it('supports case sensitive filtering', () => {
        const pipe = createLogMessageFilterPipe({excludedMessageTokens: ['Hello'], isCaseSensitive: true});
        expect(pipe('log', 'hello')).toEqual(['hello']);
        expect(pipe('log', 'Hello')).toEqual([]);
        expect(pipe('log', 'HELLO')).toEqual(['HELLO']);
        expect(pipe('log', 'Hello2')).toEqual([]);
        expect(pipe('log', '2Hello')).toEqual([]);
    });

    it('filters messages by regex tokens', () => {
        const pipe = createLogMessageFilterPipe({excludedMessageTokens: [/he..o/]});
        expect(pipe('log', 'hello')).toEqual([]);
        expect(pipe('log', 'hemmo')).toEqual([]);
        expect(pipe('log', 'heo')).toEqual(['heo']);
        expect(pipe('log', 'hero')).toEqual(['hero']);
    });

    it('checks all string args for string tokens', () => {
        const pipe = createLogMessageFilterPipe({excludedMessageTokens: ['hello']});
        expect(pipe('log', 'a', 'hello')).toEqual([]);
        expect(pipe('log', 1, 2, 3, 'hello')).toEqual([]);
    });

    it('checks all string args for regex tokens', () => {
        const pipe = createLogMessageFilterPipe({excludedMessageTokens: [/hello/]});
        expect(pipe('log', 'a', 'hello')).toEqual([]);
        expect(pipe('log', 1, 2, 3, 'hello')).toEqual([]);
    });

    it('empty string matches any message with a string token', () => {
        const pipe = createLogMessageFilterPipe({excludedMessageTokens: ['']});
        expect(pipe('log', 'hello')).toEqual([]);
        expect(pipe('log', 1, 2, 3)).toEqual([1, 2, 3]);
    });

});
