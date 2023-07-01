import {LogPipe} from './core';

export interface JsonPipeOptions {
    messagePropertyName: string;
    maxRecursionLevel: number;
    maxArrayLength: number;
    maxObjectEntries: number;
    isTopLevelProperty: (propertyName: string) => boolean;
    getObjectArgumentMessageToken: (argumentIndex: number, argument: object) => string;
    undefinedMessageValue: undefined | string;
}

export const DEFAULT_JSON_PIPE_OPTIONS: Readonly<JsonPipeOptions> = {
    messagePropertyName: '@message',
    maxRecursionLevel: 10,
    maxArrayLength: 100,
    maxObjectEntries: 100,
    isTopLevelProperty: propertyName => propertyName.startsWith('@'),
    getObjectArgumentMessageToken: argumentIndex => `$${argumentIndex + 1}`,
    undefinedMessageValue: undefined,
};

export const FUNCTION_VALUE = '[Function ~]';
export const SYMBOL_VALUE = '[Symbol ~]';
export const CIRCULAR_REFERENCE_VALUE = '[Circular ~]';
export const DEPTH_LIMIT_VALUE = '[Depth limit ~]';
export const ARRAY_LENGTH_LIMIT_VALUE = '[Array, length: $length ~]';
export const OBJECT_ENTRY_LIMIT_VALUE = '[Object, entries: $count ~]';

export function createJsonPipe(options: Partial<JsonPipeOptions> = {}): LogPipe {
    const pipeOptions: JsonPipeOptions = {...DEFAULT_JSON_PIPE_OPTIONS, ...options};
    return (type, ...args) => {
        const result: Record<string, unknown> = {};
        let message: string | undefined = undefined;
        result[pipeOptions.messagePropertyName] = undefined; // Set it first, so it will be the first property in JSON.
        let messageArgIndex = 0;
        for (let argIndex = 0; argIndex < args.length; argIndex++) {
            const arg = simplifyType(args[argIndex]);
            let messageToken = arg;
            if (typeof arg === 'object' && arg !== null) {
                const topLevelProperties = pickTopLevelProperties(arg, pipeOptions);
                for (const [topLevelPropertyName, topLevelPropertyValue] of Object.entries(topLevelProperties)) {
                    result[topLevelPropertyName] = topLevelPropertyValue;
                }
                messageToken = pipeOptions.getObjectArgumentMessageToken(messageArgIndex, arg);
                result[messageToken] = convertToSafeJson(arg, pipeOptions);
                messageArgIndex++;
            } else if (arg === undefined) {
                if (pipeOptions.undefinedMessageValue !== undefined) {
                    messageToken += pipeOptions.undefinedMessageValue;
                }
            } else {
                messageToken = arg;
            }
            message = message === undefined ? `${messageToken}` : `${message} ${messageToken}`;
        }
        if (message) {
            result[pipeOptions.messagePropertyName] = message;
        }
        return [type, JSON.stringify(result)];
    };
}

export type PickTopLevelPropertiesOptions = Pick<JsonPipeOptions, 'isTopLevelProperty'>;

export function pickTopLevelProperties(obj: object, options: PickTopLevelPropertiesOptions = DEFAULT_JSON_PIPE_OPTIONS): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (options.isTopLevelProperty(key)) {
            result[key] = value;
        }
    }
    return result;
}

export type SafeJsonObjectOptions = Pick<JsonPipeOptions, 'maxRecursionLevel' | 'maxArrayLength' | 'maxObjectEntries' | 'isTopLevelProperty'>;

/** A type with no 'symbol' & 'function': primitives + object. */
type SimplifiedType = object | null | string | undefined | number | boolean | bigint;

export function convertToSafeJson(value: unknown,
                                  options: SafeJsonObjectOptions = DEFAULT_JSON_PIPE_OPTIONS,
                                  recursionLevel = 0,
                                  visitedObjects = new Set<object>): SimplifiedType {

    if (recursionLevel > options.maxRecursionLevel) {
        return DEPTH_LIMIT_VALUE;
    }
    value = simplifyType(value);
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' || value === null || value === undefined) {
        return value;
    }
    if (visitedObjects.has(value)) {
        return CIRCULAR_REFERENCE_VALUE;
    }
    visitedObjects.add(value);
    if (Array.isArray(value)) {
        if (value.length > options.maxArrayLength) {
            return ARRAY_LENGTH_LIMIT_VALUE.replace('$length', `${value.length}`);
        }
        return value.map(v => convertToSafeJson(v, options, recursionLevel + 1, visitedObjects));
    }
    const entries = Object.entries(value);
    if (entries.length > options.maxObjectEntries) {
        return OBJECT_ENTRY_LIMIT_VALUE.replace('$count', `${entries.length}`);
    }
    const result: Record<string, unknown> = {};
    for (const [propertyName, propertyValue] of entries) {
        if (recursionLevel === 0 && options.isTopLevelProperty(propertyName)) {
            continue;// Ignore the property. The property was moved to the top level.
        }
        result [propertyName] = convertToSafeJson(propertyValue, options, recursionLevel + 1, visitedObjects);
    }
    return result;
}

export function simplifyType(value: unknown): SimplifiedType {
    if (value === null || value === undefined) {
        return value;
    }
    switch (typeof value) {
        case 'undefined':
        case 'boolean':
        case 'string':
        case 'bigint':
            return value;
        case 'number':
            if (isNaN(value)) {
                return 'NaN';
            } else if (value === Infinity) {
                return 'Infinity';
            } else if (value === -Infinity) {
                return '-Infinity';
            }
            return value;
        case 'function':
            return FUNCTION_VALUE;
        case 'symbol':
            return SYMBOL_VALUE;
        case 'object':
            if (value instanceof Set) {
                return [...value.keys()];
            }
            if (value instanceof Map) {
                return Object.fromEntries([...value.entries()]);
            }
            if (value instanceof String || value instanceof Number || value instanceof Boolean) {
                return value.valueOf();
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            break;
    }
    return value;
}
