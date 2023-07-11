import {describe, expect, it} from '@jest/globals';
import {createJsonStringifyPipe, JsonStringifyPipeOptions, LogPipe} from '../src';


describe('JsonStringifyPipe', () => {
    function createJsonStringifyPipeNoAttributes(options: Partial<JsonStringifyPipeOptions> = {}): LogPipe {
        return createJsonStringifyPipe({
            ...options,
            levelPropertyName: null,
            timestampPropertyName: null,
            idPropertyName: null,
        });
    }

    it('assigns continues indexes only for object properties', () => {
        const pipe = createJsonStringifyPipeNoAttributes();
        const result = pipe('log', '1', {a: 'a'}, '2', 3, {'b': 'b'});
        expect(result).toEqual([`{"message":"1 $1 2 3 $2","$1":{"a":"a"},"$2":{"b":"b"}}`]);
    });
});
