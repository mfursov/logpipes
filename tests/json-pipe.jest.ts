import {describe, expect, it} from '@jest/globals';
import {
    buildSafeJsonValue,
    CIRCULAR_REFERENCE_VALUE,
    DEFAULT_JSON_PIPE_OPTIONS,
    FUNCTION_VALUE,
    pickTopLevelProperties
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

    describe('buildSafeValue', () => {
        it('correctly handles primitive types', () => {
            const obj = {1: 1, '2': 2, '3': '3', '4': null, '5': undefined, '6': true, '7': 1 / 3};
            const result = buildSafeJsonValue(obj);
            expect(result).toEqual(obj);
        });

        it('correctly handles functions types', () => {
            const obj = {'foo': (): boolean => true};
            const result = buildSafeJsonValue(obj);
            expect(result).toEqual({'foo': FUNCTION_VALUE});
        });

        it('correctly handles undefined values', () => {
            const obj = {v: undefined};
            const result = buildSafeJsonValue(obj);
            expect(result).toEqual({});
        });

        it('filters out symbols as keys', () => {
            const obj = {stringProperty: '123'} as Record<symbol | string, unknown>;
            obj[symbolPropertyName] = '456';
            const result = buildSafeJsonValue(obj);
            expect(result).toEqual({stringProperty: '123'});
        });

        it('resolves circular references, direct reference', () => {
            const obj = {} as Record<string, object>;
            obj['ref'] = obj;
            const result = buildSafeJsonValue(obj);
            expect(result).toEqual({'ref': CIRCULAR_REFERENCE_VALUE});
        });

        it('resolves circular references, indirect reference', () => {
            const obj = {} as Record<string, object>;
            obj['ref'] = {obj};
            const result = buildSafeJsonValue(obj);
            expect(result).toEqual({'ref': {'obj': CIRCULAR_REFERENCE_VALUE}});
        });

        it('resolves circular references, reference in array', () => {
            const obj = {} as Record<string, object>;
            obj['array'] = [obj];
            const result = buildSafeJsonValue(obj);
            expect(result).toEqual({'array': [CIRCULAR_REFERENCE_VALUE]});
        });

        it('handles too many object properties', () => {
            const obj = {} as Record<string, unknown>;
            for (let i = 0; i < DEFAULT_JSON_PIPE_OPTIONS.maxObjectEntries; i++) {
                obj[`${i}`] = i;
            }
            let result = buildSafeJsonValue(obj);
            expect(result).toEqual(obj);

            result = buildSafeJsonValue({...obj, 'overflowField': 1});
            expect(result).toEqual(`[Object, entries: ${DEFAULT_JSON_PIPE_OPTIONS.maxObjectEntries + 1} ~]`);
        });

        it('handles too many array elements', () => {
            const array = [];
            for (let i = 0; i < DEFAULT_JSON_PIPE_OPTIONS.maxArrayLength; i++) {
                array[i] = i;
            }
            let result = buildSafeJsonValue(array);
            expect(result).toEqual(array);

            array.push('overflow');
            result = buildSafeJsonValue(array);
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
            let result = buildSafeJsonValue(topLevelObject, options);
            expect(result).toEqual(topLevelObject);

            object['child'] = {};
            result = buildSafeJsonValue(topLevelObject, options);
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
            let result = buildSafeJsonValue(topLevelArray, options);
            expect(result).toEqual(topLevelArray);

            array.push([]);
            result = buildSafeJsonValue(topLevelArray, options);
            array.pop();
            array.push('[Depth limit ~]');
            expect(result).toEqual(topLevelArray);
        });
    });

    describe('createJsonPipe', () => {
        it('creates jsonPipe with default options', () => {
            // TODO:
        });
    });
});
