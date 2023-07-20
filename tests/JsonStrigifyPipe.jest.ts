import {describe, expect, it} from '@jest/globals';
import {createJsonStringifyPipe, JsonStringifyPipeOptions, LogPipe} from '../src';


describe('JsonStringifyPipe', () => {
    function createJsonStringifyPipeNoAttributes(options: Partial<JsonStringifyPipeOptions> = {}): LogPipe {
        return createJsonStringifyPipe({
            levelPropertyName: null,
            timestampPropertyName: null,
            messageIdPropertyName: null,
            ...options,
        });
    }

    it('assigns continues indexes only for object properties', () => {
        const pipe = createJsonStringifyPipeNoAttributes();
        const result = pipe('log', '1', {a: 'a'}, '2', 3, {'b': 'b'});
        expect(result).toEqual([`{"message":"1 $1 2 3 $2","$1":{"a":"a"},"$2":{"b":"b"}}`]);
    });

    it('calls preStringifyCallback and re-uses the result', () => {
        let callbackCallCount = 0;
        const pipe = createJsonStringifyPipeNoAttributes({
                preStringifyCallback: v => {
                    callbackCallCount++;
                    return v['fieldToAdd'] = 1;
                }
            }
        );
        const result = pipe('log', 'Hello');
        expect(callbackCallCount).toBe(1);
        expect(result).toEqual([`{"message":"Hello","fieldToAdd":1}`]);
    });
});
