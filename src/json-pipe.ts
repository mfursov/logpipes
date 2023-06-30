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
    getObjectArgumentMessageToken: argumentIndex => `$${argumentIndex}`,
    undefinedMessageValue: undefined,
};

export const FUNCTION_VALUE = '[Function ~]';
export const SYMBOL_VALUE = '[Symbol ~]';
export const CIRCULAR_REFERENCE_VALUE = '[Circular ~]';
export const DEPTH_LIMIT_VALUE = '[Depth limit ~]';
export const ARRAY_LENGTH_LIMIT_VALUE = '[Array, length: $length ~]';
export const OBJECT_ENTRY_LIMIT_VALUE = '[Object, entries: $count ~]';

export function createJsonPipe(options: Partial<JsonPipeOptions>): LogPipe {
    const pipeOptions: JsonPipeOptions = {...DEFAULT_JSON_PIPE_OPTIONS, ...options};
    return (_, ...args) => {
        const result: Record<string, unknown> = {};
        let message: string | undefined = undefined;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            let messageToken = arg;
            if (typeof arg === 'function') {
                messageToken = FUNCTION_VALUE;
            } else if (typeof arg === 'symbol') {
                messageToken = SYMBOL_VALUE;
            } else if (typeof arg === 'object') {
                const topLevelProperties = pickTopLevelProperties(arg, pipeOptions);
                for (const entry of Object.entries(topLevelProperties)) {
                    result[entry[0]] = entry[1];
                }
                messageToken = pipeOptions.getObjectArgumentMessageToken(i, arg);
                result[messageToken] = buildSafeJsonValue(arg, pipeOptions);
            } else if (arg === undefined) {
                if (pipeOptions.undefinedMessageValue !== undefined) {
                    messageToken += pipeOptions.undefinedMessageValue;
                }
            } else {
                messageToken = arg;
            }
            message = message === undefined ? messageToken : message + messageToken;
        }
        if (message) {
            result[pipeOptions.messagePropertyName] = message;
        }
        return [JSON.stringify(result)];
    };
}

export type PickTopLevelPropertiesOptions = Pick<JsonPipeOptions, 'isTopLevelProperty'>;

export function pickTopLevelProperties(obj: object, options: PickTopLevelPropertiesOptions = DEFAULT_JSON_PIPE_OPTIONS): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof key === 'string' && options.isTopLevelProperty(key)) {
            result[key] = value;
        }
    }
    return result;
}

export type SafeJsonObjectOptions = Pick<JsonPipeOptions, 'maxRecursionLevel' | 'maxArrayLength' | 'maxObjectEntries' | 'isTopLevelProperty'>;

export function buildSafeJsonValue(value: unknown,
                                   options: SafeJsonObjectOptions = DEFAULT_JSON_PIPE_OPTIONS,
                                   recursionLevel = 0,
                                   visitedObjects = new Set<object>): object | null | string | undefined | number | boolean {

    if (recursionLevel > options.maxRecursionLevel) {
        return DEPTH_LIMIT_VALUE;
    }
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' || value === null || value === undefined) {
        return value;
    }
    if (typeof value === 'function') {
        return FUNCTION_VALUE;
    }
    if (typeof value === 'symbol') {
        return SYMBOL_VALUE;
    }
    if (visitedObjects.has(value)) {
        return CIRCULAR_REFERENCE_VALUE;
    }
    visitedObjects.add(value);
    if (Array.isArray(value)) {
        if (value.length > options.maxArrayLength) {
            return ARRAY_LENGTH_LIMIT_VALUE.replace('$length', `${value.length}`);
        }
        return value.map(v => buildSafeJsonValue(v, options, recursionLevel + 1, visitedObjects));
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
        result [propertyName] = buildSafeJsonValue(propertyValue, options, recursionLevel + 1, visitedObjects);
    }
    return result;
}
