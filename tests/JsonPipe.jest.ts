import {describe, expect, it} from '@jest/globals';
import {createJsonPipe, DEFAULT_JSON_PIPE_OPTIONS, JsonPipeOptions, LogPipe, pickTopLevelProperties} from '../src';

describe('JsonPipe', () => {

    const symbolPropertyName = Symbol('symbol');

    describe('pickTopLevelProperties', () => {
        it('picks correct properties with a default picker', () => {
            const obj = {a: 0, '@a': 1, b: 2, '': 3, 4: 4} as Record<string | number | symbol, unknown>;
            obj[symbolPropertyName] = 5;
            const result = pickTopLevelProperties(obj);
            expect(result).toEqual({'@a': 1});
        });

        it('picks correct properties with a custom picker', () => {
            const obj = {a: 0, '@a': 1, b: 2, '': 3, 4: 4, 22: 22} as Record<string | number | symbol, unknown>;
            obj[symbolPropertyName] = 5;
            const result = pickTopLevelProperties(obj, {isTopLevelProperty: propertyName => propertyName.length === 1});
            expect(result).toEqual({a: 0, b: 2, '4': 4} as Record<string, unknown>);
        });

        it('does not picks symbols or numbers', () => {
            const obj = {1: 1} as Record<string | number | symbol, unknown>;
            obj[symbolPropertyName] = 5;
            const result = pickTopLevelProperties(obj, {isTopLevelProperty: () => true});
            expect(result).toEqual({'1': 1});
        });

        it('does not picks system properties', () => {
            const obj = {a: 1, b: 2};
            const result = pickTopLevelProperties(obj, {isTopLevelProperty: () => true, ignoredPropertyNames: ['b']});
            expect(result).toEqual({a: 1});
        });
    });

    describe('createJsonPipe', () => {
        function createJsonPipeNoAttributes(options: Partial<JsonPipeOptions> = {}): LogPipe {
            return createJsonPipe({
                ...options,
                levelPropertyName: null,
                timestampPropertyName: null,
                idPropertyName: null,
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

        it('supports top level properties with a default matcher', () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', {'@world': 'World'});
            expect(result).toEqual([{'message': 'Hello, $1', '@world': 'World', '$1': {}}]);
        });

        it('supports top level properties with a custom matcher', () => {
            const pipe = createJsonPipeNoAttributes({isTopLevelProperty: name => name.startsWith('#')});
            const result = pipe('log', 'Hello,', {'#world': 'World'});
            expect(result).toEqual([{'message': 'Hello, $1', '#world': 'World', '$1': {}}]);
        });

        it(`top level properties can't overwrite built-in properties (like 'message')`, () => {
            const pipe = createJsonPipeNoAttributes();
            const result = pipe('log', 'Hello,', {'message': 'World'});
            expect(result).toEqual([{'message': 'Hello, $1', '$1': {'message': 'World'}}]);
        });

        it(`adds '@timestamp' and 'level'`, () => {
            const pipe = createJsonPipe({
                timestampPropertyFormatter: () => 'formatted-timestamp',
                idPropertyName: null,
            });
            const result = pipe('log', 'Hello');
            expect(result).toEqual([{'message': 'Hello', 'level': 'log', '@timestamp': 'formatted-timestamp'}]);
        });

        it(`support custom of '@timestamp' and 'level' properties`, () => {
            const pipe = createJsonPipe({
                levelPropertyName: 'category',
                levelPropertyFormatter: level => `[${level.toUpperCase()}]`,
                timestampPropertyName: 'date',
                timestampPropertyFormatter: () => 'formatted-timestamp',
                idPropertyName: null,
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

        it('generate unique message ids', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.idPropertyName as string];
            expect(id).toBeTruthy();
            expect(isUuid(id)).toBe(true);
        });

        it('allow message id field name override', () => {
            const pipe = createJsonPipe({idPropertyName: 'my-field-name'});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result['my-field-name'];
            expect(id).toBeTruthy();
            expect(isUuid(id)).toBe(true);
        });

        it('does not generate messageId if asked', () => {
            const pipe = createJsonPipe({idPropertyName: null});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.idPropertyName as string];
            expect(id).toBeUndefined();
        });

        it('does not generate messageId if asked', () => {
            const pipe = createJsonPipe({idPropertyName: null});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.idPropertyName as string];
            expect(id).toBeUndefined();
        });

        it('uses message id value provider', () => {
            const pipe = createJsonPipe({idPropertyProvider: () => 'my-value'});
            const result = pipe('log', 'Hello')[0] as Record<string, unknown>;
            const id = result[DEFAULT_JSON_PIPE_OPTIONS.idPropertyName as string];
            expect(id).toBe('my-value');
        });
    });
});

function isUuid(value: unknown): boolean {
    return typeof value === 'string' &&
        new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i).test(value);
}
