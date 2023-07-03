import {describe, expect, it} from '@jest/globals';
import {createJsonStringifyPipe, JsonPipeOptions, LogPipe, pickTopLevelProperties} from '../src';

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

    describe('createJsonStringifyPipe', () => {
        function createJsonStringifyPipeNoAttributes(options: Partial<JsonPipeOptions> = {}): LogPipe {
            return createJsonStringifyPipe({...options, levelPropertyName: null, timestampPropertyName: null});
        }

        it('creates jsonStringifyPipe with default options', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', {});
            expect(result).toEqual(['log', `{"message":"$1","$1":{}}`]);
        });

        it('empty log call results to an empty json with no message', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log');
            expect(result).toEqual(['log', `{}`]);
        });

        it('a log call with an empty object results to a json with a message', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', {});
            expect(result).toEqual(['log', `{"message":"$1","$1":{}}`]);
        });

        it('a log call with an empty array results to a json with a message', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', []);
            expect(result).toEqual(['log', `{"message":"$1","$1":[]}`]);
        });

        it('null parameter processed as a space separated null', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', null);
            expect(result).toEqual(['log', `{"message":"Hello, null"}`]);
        });

        it('undefined parameter processed as a space separated undefined', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', undefined);
            expect(result).toEqual(['log', `{"message":"Hello, undefined"}`]);
        });

        it('boolean parameter processed as a space separated boolean', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', true);
            expect(result).toEqual(['log', `{"message":"Hello, true"}`]);
        });

        it('number parameter processed as a space separated number', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', 42);
            expect(result).toEqual(['log', `{"message":"Hello, 42"}`]);
        });

        it('string parameter processed as a space separated string', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', 'World');
            expect(result).toEqual(['log', `{"message":"Hello, World"}`]);
        });

        it('assigns continues indexes only for object properties', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', '1', {a: 'a'}, '2', 3, {'b': 'b'});
            expect(result).toEqual(['log', `{"message":"1 $1 2 3 $2","$1":{"a":"a"},"$2":{"b":"b"}}`]);
        });

        it('simplifyValue is used', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', new Set([1, true, '3']));
            expect(result).toEqual(['log', `{"message":"Hello, $1","$1":[1,true,"3"]}`]);
        });

        it('supports top level properties with a default matcher', () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', {'@world': 'World'});
            expect(result).toEqual(['log', `{"message":"Hello, $1","@world":"World","$1":{}}`]);
        });

        it('supports top level properties with a custom matcher', () => {
            const pipe = createJsonStringifyPipeNoAttributes({isTopLevelProperty: name => name.startsWith('#')});
            const result = pipe('log', 'Hello,', {'#world': 'World'});
            expect(result).toEqual(['log', `{"message":"Hello, $1","#world":"World","$1":{}}`]);
        });

        it(`top level properties can't overwrite built-in properties (like 'message')`, () => {
            const pipe = createJsonStringifyPipeNoAttributes();
            const result = pipe('log', 'Hello,', {'message': 'World'});
            expect(result).toEqual(['log', `{"message":"Hello, $1","$1":{"message":"World"}}`]);
        });

        it(`adds @timestamp and @level`, () => {
            const pipe = createJsonStringifyPipe({timestampPropertyFormatter: () => 'formatted-timestamp'});
            const result = pipe('log', 'Hello');
            expect(result).toEqual(['log', `{"message":"Hello","@level":"log","@timestamp":"formatted-timestamp"}`]);
        });

        it(`support custom of @timestamp and @level properties`, () => {
            const pipe = createJsonStringifyPipe({
                levelPropertyName: '@category',
                levelPropertyFormatter: level => `[${level.toUpperCase()}]`,
                timestampPropertyName: '@date',
                timestampPropertyFormatter: () => 'formatted-timestamp'
            });
            const result = pipe('debug', 'Hello');
            expect(result).toEqual(['debug', `{"message":"Hello","@category":"[DEBUG]","@date":"formatted-timestamp"}`]);
        });
    });
});
