import {describe, expect, it} from '@jest/globals';
import {createDateTimePipe} from '../src/DateTimePipe';

describe('DateTimePipe', () => {
    it('appends date', () => {
        const startTime = Date.now();
        const input: unknown[] = [1, 2, 3, true, '123', [], {}, (): number => 1];
        const pipe = createDateTimePipe();
        const output = pipe('info', ...input);
        const endTime = Date.now();
        expect(typeof output[0]).toBe('string');
        const loggedDateTime = new Date(output[0] as string);
        expect(loggedDateTime.getTime()).toBeGreaterThanOrEqual(startTime);
        expect(loggedDateTime.getTime()).toBeLessThanOrEqual(endTime);
        for (let i = 1; i < output.length; i++) {
            expect(output[i]).toBe(input[i - 1]);
        }
    });

    it('calls formatter', () => {
        const input: unknown[] = [1, 2, 3, true, '123', [], {}, (): number => 1];
        const pipe = createDateTimePipe({dateFormatter: () => 'hello'});
        const output = pipe('info', ...input);
        expect(output[0]).toBe('hello');
        expect(output.length).toBe(input.length + 1);
    });
});
