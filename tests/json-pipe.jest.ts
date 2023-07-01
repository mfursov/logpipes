// noinspection JSPrimitiveTypeWrapperUsage

import {describe, expect, it} from '@jest/globals';
import {
    CIRCULAR_REFERENCE_VALUE,
    convertToSafeJson,
    createJsonPipe,
    DEFAULT_JSON_PIPE_OPTIONS,
    FUNCTION_VALUE,
    pickTopLevelProperties,
    simplifyType
} from '../src';

describe('JsonPipe', () => {

    const symbolPropertyName = Symbol('');

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
    });

    describe('convertToSafeJson', () => {
        it('correctly handles primitive types', () => {
            const obj = {1: 1, '2': 2, '3': '3', '4': null, '5': undefined, '6': true, '7': 1 / 3};
            const result = convertToSafeJson(obj);
            expect(result).toEqual(obj);
        });

        it('correctly handles functions types', () => {
            const obj = {'foo': (): boolean => true};
            const result = convertToSafeJson(obj);
            expect(result).toEqual({'foo': FUNCTION_VALUE});
        });

        it('correctly handles undefined values', () => {
            const obj = {v: undefined};
            const result = convertToSafeJson(obj);
            expect(result).toEqual({});
        });

        it('filters out symbols as keys', () => {
            const obj = {stringProperty: '123'} as Record<symbol | string, unknown>;
            obj[symbolPropertyName] = '456';
            const result = convertToSafeJson(obj);
            expect(result).toEqual({stringProperty: '123'});
        });

        it('resolves circular references, direct reference', () => {
            const obj = {} as Record<string, object>;
            obj['ref'] = obj;
            const result = convertToSafeJson(obj);
            expect(result).toEqual({'ref': CIRCULAR_REFERENCE_VALUE});
        });

        it('resolves circular references, indirect reference', () => {
            const obj = {} as Record<string, object>;
            obj['ref'] = {obj};
            const result = convertToSafeJson(obj);
            expect(result).toEqual({'ref': {'obj': CIRCULAR_REFERENCE_VALUE}});
        });

        it('resolves circular references, reference in array', () => {
            const obj = {} as Record<string, object>;
            obj['array'] = [obj];
            const result = convertToSafeJson(obj);
            expect(result).toEqual({'array': [CIRCULAR_REFERENCE_VALUE]});
        });

        it('handles too many object properties', () => {
            const obj = {} as Record<string, unknown>;
            for (let i = 0; i < DEFAULT_JSON_PIPE_OPTIONS.maxObjectEntries; i++) {
                obj[`${i}`] = i;
            }
            let result = convertToSafeJson(obj);
            expect(result).toEqual(obj);

            result = convertToSafeJson({...obj, 'overflowField': 1});
            expect(result).toEqual(`[Object, entries: ${DEFAULT_JSON_PIPE_OPTIONS.maxObjectEntries + 1} ~]`);
        });

        it('handles too many array elements', () => {
            const array = [];
            for (let i = 0; i < DEFAULT_JSON_PIPE_OPTIONS.maxArrayLength; i++) {
                array[i] = i;
            }
            let result = convertToSafeJson(array);
            expect(result).toEqual(array);

            array.push('overflow');
            result = convertToSafeJson(array);
            expect(result).toEqual(`[Array, length: ${DEFAULT_JSON_PIPE_OPTIONS.maxArrayLength + 1} ~]`);
        });

        it('handles too deep recursion for objects', () => {
            const options = {...DEFAULT_JSON_PIPE_OPTIONS, maxRecursionLevel: 3};
            let object: Record<string, unknown> = {};
            const topLevelObject = object;
            for (let i = 0; i < options.maxRecursionLevel; i++) {
                const child = {};
                object['child'] = child;
                object = child;
            }
            let result = convertToSafeJson(topLevelObject, options);
            expect(result).toEqual(topLevelObject);

            object['child'] = {};
            result = convertToSafeJson(topLevelObject, options);
            object['child'] = '[Depth limit ~]';
            expect(result).toEqual(topLevelObject);
        });

        it('handles too deep recursion for arrays', () => {
            const options = {...DEFAULT_JSON_PIPE_OPTIONS, maxRecursionLevel: 3};
            let array: (object | string)[] = [];
            const topLevelArray = array;
            for (let i = 0; i < options.maxRecursionLevel; i++) {
                const child: (object | string)[] = [];
                array.push(child);
                array = child;
            }
            let result = convertToSafeJson(topLevelArray, options);
            expect(result).toEqual(topLevelArray);

            array.push([]);
            result = convertToSafeJson(topLevelArray, options);
            array.pop();
            array.push('[Depth limit ~]');
            expect(result).toEqual(topLevelArray);
        });

        it('simplifyType is used', () => {
            const result = convertToSafeJson(new Set([1, true, '3']));
            expect(result).toEqual([1, true, '3']);
        });
    });

    describe('simplifyType', () => {
        it('Boolean parameter processed as a space separated boolean', () => {
            const result = simplifyType(new Boolean(true));
            expect(result).toBe(true);
        });

        it('Number parameter processed as a space separated number', () => {
            const result = simplifyType(new Number(1));
            expect(result).toBe(1);
        });

        it('Converts NaN to string', () => {
            const result = simplifyType(NaN);
            expect(result).toEqual('NaN');
        });

        it('Converts Infinity to string', () => {
            const result = simplifyType(Infinity);
            expect(result).toEqual('Infinity');
        });

        it('Converts -Infinity to string', () => {
            const result = simplifyType(-Infinity);
            expect(result).toEqual('-Infinity');
        });
        it('String object parameter processed as a space separated string', () => {
            const result = simplifyType(new String('hello'));
            expect(result).toBe('hello');
        });

        it('BigInt object parameter processed as a space separated string', () => {
            const bigIntAsString = '1000000000000000000000000000000000000000000';
            const result = simplifyType(BigInt(bigIntAsString));
            expect(result).toBe(BigInt(bigIntAsString));
        });

        it('Date object parameter processed as an ISO formatted string', () => {
            const result = simplifyType(new Date(0));
            expect(result).toBe('1970-01-01T00:00:00.000Z');
        });

        it('Set object parameter processed as an array', () => {
            const result = simplifyType(new Set(['1', '2', '3']));
            expect(result).toEqual(['1', '2', '3']);
        });

        it('Map object parameter processed as a record', () => {
            const result = simplifyType(new Map([['k1', 'v1'], ['k2', 'v2']]));
            expect(result).toEqual({'k1': 'v1', 'k2': 'v2'});
        });
    });

    describe('createJsonPipe', () => {
        it('creates jsonPipe with default options', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', {});
            expect(result).toEqual(['log', `{"@message":"$1","$1":{}}`]);
        });

        it('empty log call results to an empty json with no message', () => {
            const pipe = createJsonPipe();
            const result = pipe('log');
            expect(result).toEqual(['log', `{}`]);
        });

        it('a log call with an empty object results to a json with a message', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', {});
            expect(result).toEqual(['log', `{"@message":"$1","$1":{}}`]);
        });

        it('a log call with an empty array results to a json with a message', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', []);
            expect(result).toEqual(['log', `{"@message":"$1","$1":[]}`]);
        });

        it('null parameter processed as a space separated null', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello,', null);
            expect(result).toEqual(['log', `{"@message":"Hello, null"}`]);
        });

        it('undefined parameter processed as a space separated undefined', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello,', undefined);
            expect(result).toEqual(['log', `{"@message":"Hello, undefined"}`]);
        });

        it('boolean parameter processed as a space separated boolean', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello,', true);
            expect(result).toEqual(['log', `{"@message":"Hello, true"}`]);
        });

        it('number parameter processed as a space separated number', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello,', 42);
            expect(result).toEqual(['log', `{"@message":"Hello, 42"}`]);
        });

        it('string parameter processed as a space separated string', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello,', 'World');
            expect(result).toEqual(['log', `{"@message":"Hello, World"}`]);
        });

        it('assigns continues indexes only for object properties', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', '1', {a: 'a'}, '2', 3, {'b': 'b'});
            expect(result).toEqual(['log', `{"@message":"1 $1 2 3 $2","$1":{"a":"a"},"$2":{"b":"b"}}`]);
        });

        it('simplifyType is used', () => {
            const pipe = createJsonPipe();
            const result = pipe('log', 'Hello,', new Set([1, true, '3']));
            expect(result).toEqual(['log', `{"@message":"Hello, $1","$1":[1,true,"3"]}`]);
        });
    });
});
