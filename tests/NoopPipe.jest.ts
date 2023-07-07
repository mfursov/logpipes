import {describe, expect, it} from '@jest/globals';
import {createNoopPipe} from '../src';

describe('NoopPipe', () => {
    it('does not change parameters', () => {
        const input: unknown[] = [1, 2, 3, true, '123', [], {}, (): number => 1];
        const output = createNoopPipe()('log', ...input);
        expect(output).toEqual(input);
        for (let i = 0; i < output.length; i++) {
            expect(output[i]).toBe(input[i]);
        }
    });
});
