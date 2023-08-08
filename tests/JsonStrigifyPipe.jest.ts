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

    it('returns correct lastMessageId', () => {
        const id1 = 'id1';
        const id2 = 'id2';
        const pipe = createJsonStringifyPipe({messageIdPropertyProvider: level => level === 'log' ? id1 : id2});
        expect(pipe.getLastMessageId()).toBe('');

        pipe('log', 'Hello');
        expect(pipe.getLastMessageId()).toBe(id1);

        pipe('debug', 'Hello');
        expect(pipe.getLastMessageId()).toBe(id2);
    });

    it('keeps lastMessageId empty if generation of message id is disabled', () => {
        const pipe = createJsonStringifyPipe({messageIdPropertyName: null});
        expect(pipe.getLastMessageId()).toBe('');

        pipe('log', 'Hello');
        expect(pipe.getLastMessageId()).toBe('');
    });

    it('uses message id set by setMessageId', () => {
        const pipe = createJsonStringifyPipe({messageIdPropertyProvider: () => 'provider-message-id'});
        pipe.setNextMessageId('custom-message-id');
        pipe('debug', 'Hello');
        expect(pipe.getLastMessageId()).toBe('custom-message-id');

        pipe('log', 'Hello');
        expect(pipe.getLastMessageId()).toBe('provider-message-id');
    });
});
