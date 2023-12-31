import {describe, expect, it} from '@jest/globals';
import {createJsonPipe, getDefaultJsonPipeOptions, JsonPipeOptions, LogPipe,} from '../src';

const DEFAULT_JSON_PIPE_OPTIONS = getDefaultJsonPipeOptions();

describe('JsonPipe', () => {

    describe('createJsonPipe', () => {
        function createJsonPipeNoAttributes(options: Partial<JsonPipeOptions> = {}): LogPipe {
            return createJsonPipe({
                ...options,
                levelPropertyName: null,
                timestampPropertyName: null,
                messageIdPropertyName: null,
            });
        }

        it('creates JsonPipe with default options', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', {});
            expect(result).toEqual([{'message': '$1', '$1': {}}]);
        });

        it('empty log call results to an empty json with no message', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log');
            expect(result).toEqual([{}]);
        });

        it('a log call with an empty object results to a json with a message', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', {});
            expect(result).toEqual([{'message': '$1', '$1': {}}]);
        });

        it('a log call with an empty array results to a json with a message', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', []);
            expect(result).toEqual([{'message': '$1', '$1': []}]);
        });

        it('null parameter processed as a space separated null', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', null);
            expect(result).toEqual([{'message': 'Hello, null'}]);
        });

        it('undefined parameter processed as a space separated undefined', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', undefined);
            expect(result).toEqual([{'message': 'Hello, undefined'}]);
        });

        it('boolean parameter processed as a space separated boolean', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', true);
            expect(result).toEqual([{'message': 'Hello, true'}]);
        });

        it('number parameter processed as a space separated number', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', 42);
            expect(result).toEqual([{'message': 'Hello, 42'}]);
        });

        it('string parameter processed as a space separated string', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', 'World');
            expect(result).toEqual([{'message': 'Hello, World'}]);
        });

        it('ignores properties with a symbol key', () => {
            const pipe = createJsonPipeNoAttributes();
            const object: Record<symbol | string, unknown> = {};
            object[Symbol('symbol')] = 'Ignored';
            const result = pipe('log', object);
            expect(result).toEqual([{'message': '$1', '$1': {}}]);
        });

        it('assigns continues indexes only for object properties', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', '1', {a: 'a'}, '2', 3, {'b': 'b'});
            expect(result).toEqual([{'message': '1 $1 2 3 $2', '$1': {'a': 'a'}, '$2': {'b': 'b'}}]);
        });

        it('simplifyValue is used', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', new Set([1, true, '3']));
            expect(result).toEqual([{'message': 'Hello, $1', '$1': [1, true, '3']}]);
        });

        it(`adds 'timestamp' and 'level'`, () => {
            const pipe = createJsonPipe({
                timestampPropertyFormatter: () => 'formatted-timestamp',
                messageIdPropertyName: null,
            });
            const result = pipe('log', 'Hello');
            expect(result).toEqual([{'message': 'Hello', 'level': 'log', 'timestamp': 'formatted-timestamp'}]);
        });

        it(`support custom of 'timestamp' and 'level' properties`, () => {
            const pipe = createJsonPipe({
                levelPropertyName: 'category',
                levelPropertyFormatter: level => `[${level.toUpperCase()}]`,
                timestampPropertyName: 'date',
                timestampPropertyFormatter: () => 'formatted-timestamp',
                messageIdPropertyName: null,
            });
            const result = pipe('debug', 'Hello');
            expect(result).toEqual([{'message': 'Hello', 'category': '[DEBUG]', 'date': 'formatted-timestamp'}]);
        });

        it('correctly handles undefined fields of objects args', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello', {a: undefined});
            expect(result).toEqual([{'message': 'Hello $1', '$1': {}}]);
        });

        it('passed correct argumentIndex and originalArgumentIndex to the getObjectMessageToken', () => {
            let callCount = 0;
            const pipe = createJsonPipe({
                getObjectMessageToken: (argumentIndex, argument, originalArgumentIndex) => {
                    const input = argument as { expectedIndex: number, expectedOriginalIndex: number };
                    expect(argumentIndex).toBe(input.expectedIndex);
                    expect(originalArgumentIndex).toBe(input.expectedOriginalIndex);
                    callCount++;
                    return `#${argumentIndex}`;
                }
            });
            const result = pipe('log', 'a', {expectedIndex: 0, expectedOriginalIndex: 1}, 'b',
                {expectedIndex: 1, expectedOriginalIndex: 3})[0] as Record<string, unknown>;
            expect(result['message']).toBe('a #0 b #1');
            expect(callCount).toBe(2);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects is false by default', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello', {headers: {header1: '1', header2: '2'}});
            expect(result).toEqual([{'message': 'Hello $1', '$1': {'headers': {'header1': '1', 'header2': '2'}}}]);
        });

        it('supports pickFieldNameAsObjectMessageTokenForSingleFieldObjects set to true', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {headers: {header1: '1', header2: '2'}});
            expect(result).toEqual([{'message': 'Hello $headers', '$headers': {'header1': '1', 'header2': '2'}}]);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects set to true and undefined field value', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {body: undefined});
            expect(result).toEqual([{'message': 'Hello $body:[undefined]'}]);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects set to true and null field value', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {body: null});
            expect(result).toEqual([{'message': 'Hello $body:[null]'}]);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects set to true and string field value', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {body: '123'});
            expect(result).toEqual([{'message': 'Hello $body:[\'123\']'}]);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects set to true and numeric field value', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {body: 123});
            expect(result).toEqual([{'message': 'Hello $body:[123]'}]);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects set to true and boolean field value', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {body: false});
            expect(result).toEqual([{'message': 'Hello $body:[false]'}]);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects set to true and boolean field value', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {body: false});
            expect(result).toEqual([{'message': 'Hello $body:[false]'}]);
        });

        it('pickFieldNameAsObjectMessageTokenForSingleFieldObjects resolves duplicates', () => {
            const pipe = createJsonPipeNoAttributes({pickFieldNameAsObjectMessageTokenForSingleFieldObjects: true});
            const result = pipe('log', 'Hello', {foo: {text: 'foo1'}}, {foo: {text: 'foo2'}});
            expect(result).toEqual([{'message': 'Hello $foo $1', '$foo': {text: 'foo1'}, '$1': {foo: {text: 'foo2'}}}]);
        });

        it('generate unique message ids', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.messageIdPropertyName];
            expect(id).toBeTruthy();
            expect(isUuid(id)).toBe(true);
        });

        it(`allow 'id' field name override`, () => {
            const pipe = createJsonPipe({messageIdPropertyName: 'my-field-name'});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result['my-field-name'];
            expect(id).toBeTruthy();
            expect(isUuid(id)).toBe(true);
        });

        it(`does not generate 'id' field if asked`, () => {
            const pipe = createJsonPipe({messageIdPropertyName: null});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.messageIdPropertyName];
            expect(id).toBeUndefined();
        });

        it('uses message id value provider', () => {
            const pipe = createJsonPipe({messageIdPropertyProvider: () => 'my-value'});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.messageIdPropertyName];
            expect(id).toBe('my-value');
        });

        it('handles case when messageIdPropertyProvider returns undefined', () => {
            const pipe = createJsonPipe({messageIdPropertyProvider: () => undefined});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.messageIdPropertyName] as string;
            expect(id).toBeDefined();
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(UUID_REGEX.test(id)).toBe(true);
        });

        it('returns correct lastMessageId', () => {
            const id1 = 'id1';
            const id2 = 'id2';
            const pipe = createJsonPipe({messageIdPropertyProvider: level => level === 'log' ? id1 : id2});
            expect(pipe.getLastMessageId()).toBe('');

            let result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            let id = result[DEFAULT_JSON_PIPE_OPTIONS.messageIdPropertyName];
            expect(id).toBe(id1);
            expect(pipe.getLastMessageId()).toBe(id1);

            result = pipe('debug', 'Hello')[0] as Record<string, unknown>;
            id = result[DEFAULT_JSON_PIPE_OPTIONS.messageIdPropertyName];
            expect(id).toBe(id2);
            expect(pipe.getLastMessageId()).toBe(id2);
        });

        it('keeps lastMessageId empty if generation of message id is disabled', () => {
            const pipe = createJsonPipe({messageIdPropertyName: null});
            expect(pipe.getLastMessageId()).toBe('');

            pipe('log', 'Hello');
            expect(pipe.getLastMessageId()).toBe('');
        });

        it('uses message id set by setMessageId', () => {
            const pipe = createJsonPipe({messageIdPropertyProvider: () => 'provider-message-id'});
            pipe.setNextMessageId('custom-message-id');
            pipe('debug', 'Hello');
            expect(pipe.getLastMessageId()).toBe('custom-message-id');

            pipe('log', 'Hello');
            expect(pipe.getLastMessageId()).toBe('provider-message-id');
        });
    });
});

function isUuid(value: unknown): boolean {
    return typeof value === 'string' &&
        new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i).test(value);
}
