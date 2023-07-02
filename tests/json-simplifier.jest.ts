// noinspection JSPrimitiveTypeWrapperUsage

import {describe, expect, it} from '@jest/globals';
import {DEFAULT_SIMPLIFY_JSON_OPTIONS, simplifyJson, simplifyValue} from '../src/json-simplifier';
import {DEFAULT_JSON_PIPE_OPTIONS} from '../src';

describe('JsonSimplifier', () => {

    const symbolPropertyName = Symbol('symbol');

    describe('simplifyJson', () => {
        it('correctly handles primitive types', () => {
            const obj = {1: 1, '2': 2, '3': '3', '4': null, '5': undefined, '6': true, '7': 1 / 3};
            const result = simplifyJson(obj);
            expect(result).toEqual(obj);
        });

        it('correctly handles functions types', () => {
            const obj = {'foo': (): boolean => true};
            const result = simplifyJson(obj);
            expect(result).toEqual({'foo': DEFAULT_SIMPLIFY_JSON_OPTIONS.functionValue});
        });

        it('correctly handles undefined values', () => {
            const obj = {v: undefined};
            const result = simplifyJson(obj);
            expect(result).toEqual({});
        });

        it('filters out symbols as keys', () => {
            const obj = {stringProperty: '123'} as Record<symbol | string, unknown>;
            obj[symbolPropertyName] = '456';
            const result = simplifyJson(obj);
            expect(result).toEqual({stringProperty: '123'});
        });

        it('resolves circular references, direct reference', () => {
            const obj = {} as Record<string, object>;
            obj['ref'] = obj;
            const result = simplifyJson(obj);
            expect(result).toEqual({'ref': DEFAULT_SIMPLIFY_JSON_OPTIONS.circularReferenceValue});
        });

        it('resolves circular references, indirect reference', () => {
            const obj = {} as Record<string, object>;
            obj['ref'] = {obj};
            const result = simplifyJson(obj);
            expect(result).toEqual({'ref': {'obj': DEFAULT_SIMPLIFY_JSON_OPTIONS.circularReferenceValue}});
        });

        it('resolves circular references, reference in array', () => {
            const obj = {} as Record<string, object>;
            obj['array'] = [obj];
            const result = simplifyJson(obj);
            expect(result).toEqual({'array': [DEFAULT_SIMPLIFY_JSON_OPTIONS.circularReferenceValue]});
        });

        it('handles too many object properties', () => {
            const obj = {} as Record<string, unknown>;
            for (let i = 0; i < DEFAULT_SIMPLIFY_JSON_OPTIONS.maxObjectProperties; i++) {
                obj[`${i}`] = i;
            }
            let result = simplifyJson(obj);
            expect(result).toEqual(obj);

            result = simplifyJson({...obj, 'overflowField': 1});
            expect(result).toEqual(`[Object, properties: ${DEFAULT_JSON_PIPE_OPTIONS.maxObjectProperties + 1} ~]`);
        });

        it('handles too many array elements', () => {
            const array = [];
            for (let i = 0; i < DEFAULT_JSON_PIPE_OPTIONS.maxArrayLength; i++) {
                array[i] = i;
            }
            let result = simplifyJson(array);
            expect(result).toEqual(array);

            array.push('overflow');
            result = simplifyJson(array);
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
            let result = simplifyJson(topLevelObject, options);
            expect(result).toEqual(topLevelObject);

            object['child'] = {};
            result = simplifyJson(topLevelObject, options);
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
            let result = simplifyJson(topLevelArray, options);
            expect(result).toEqual(topLevelArray);

            array.push([]);
            result = simplifyJson(topLevelArray, options);
            array.pop();
            array.push('[Depth limit ~]');
            expect(result).toEqual(topLevelArray);
        });

        function checkError(value: unknown, name: string, message: string): void {
            const error = value as { name: string, message: string, stack: string };
            expect(error.name).toBe(name);
            expect(error.message).toBe(message);
            expect(error.stack.startsWith(`${name}: ${message}`)).toBe(true);
            expect(error.stack.includes('at Object.')).toBe(true);
        }

        it('handles Error object', () => {
            const error = new Error('error-message');
            const result = simplifyJson(error);
            checkError(result, error.name, error.message);
        });

        it(`handles Error object with 'cause' field`, () => {
            const cause = new Error('original-error');
            const error = new Error('error-message', {cause});
            const result = simplifyJson(error) as { cause: unknown };
            checkError(result, error.name, error.message);
            checkError(result.cause, cause.name, cause.message);
        });

        it(`handles ignored properties`, () => {
            const result = simplifyJson({a: 1, b: 2}, {isIgnoredProperty: name => name === 'a'});
            expect(result).toEqual({b: 2});
        });

        it('simplifyValue is used', () => {
            const result = simplifyJson(new Set([1, true, '3']));
            expect(result).toEqual([1, true, '3']);
        });
    });

    describe('simplifyValue', () => {
        it('Boolean parameter processed as a space separated boolean', () => {
            const result = simplifyValue(new Boolean(true));
            expect(result).toBe(true);
        });

        it('Number parameter processed as a space separated number', () => {
            const result = simplifyValue(new Number(1));
            expect(result).toBe(1);
        });

        it('Converts NaN to string', () => {
            const result = simplifyValue(NaN);
            expect(result).toEqual('NaN');
        });

        it('Converts Infinity to string', () => {
            const result = simplifyValue(Infinity);
            expect(result).toEqual('Infinity');
        });

        it('Converts -Infinity to string', () => {
            const result = simplifyValue(-Infinity);
            expect(result).toEqual('-Infinity');
        });
        it('String object parameter processed as a space separated string', () => {
            const result = simplifyValue(new String('hello'));
            expect(result).toBe('hello');
        });

        it('BigInt object parameter processed as a space separated string', () => {
            const bigIntAsString = '1000000000000000000000000000000000000000000';
            const result = simplifyValue(BigInt(bigIntAsString));
            expect(result).toBe(BigInt(bigIntAsString));
        });

        it('Date object parameter processed as an ISO formatted string', () => {
            const result = simplifyValue(new Date(0));
            expect(result).toBe('1970-01-01T00:00:00.000Z');
        });

        it('Set object parameter processed as an array', () => {
            const result = simplifyValue(new Set(['1', '2', '3']));
            expect(result).toEqual(['1', '2', '3']);
        });

        it('Map object parameter processed as a record', () => {
            const result = simplifyValue(new Map([['k1', 'v1'], ['k2', 'v2']]));
            expect(result).toEqual({'k1': 'v1', 'k2': 'v2'});
        });
    });

});
