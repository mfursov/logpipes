export interface SimplifyJsonOptions {
    maxRecursionLevel: number;
    maxArrayLength: number;
    maxObjectProperties: number;
    isIgnoredProperty: (propertyName: string) => boolean;
    depthLimitValue: string;
    circularReferenceValue: string;
    arrayLengthLimitValue: string;
    objectPropertyCountLimitValue: string;
    functionValue: string;
    symbolValue: string;
}

export const DEFAULT_SIMPLIFY_JSON_OPTIONS: Readonly<SimplifyJsonOptions> = {
    maxRecursionLevel: 10,
    maxArrayLength: 100,
    maxObjectProperties: 100,
    isIgnoredProperty: propertyName => propertyName.startsWith('@'),

    depthLimitValue: '[Depth limit ~]',
    circularReferenceValue: '[Circular ~]',
    arrayLengthLimitValue: '[Array, length: $length ~]',
    objectPropertyCountLimitValue: '[Object, properties: $count ~]',
    functionValue: '[Function ~]',
    symbolValue: '[Symbol ~]',
};

/** Properties aren't returned by Object.entries(), but available on the Error object. */
const ERROR_OBJECT_PROPERTIES = ['cause', 'message', 'name', 'stack'];

/** A type with no 'symbol' & 'function': primitives + object. */
type SimplifiedType = object | null | string | undefined | number | boolean | bigint;

/**
 * Converts given value to a 'simplified' JSON object.
 * A 'simplified' object is an object that can be restored into the original form using JSON.parse(JSON.stringify(obj)).
 */
export function simplifyJson(value: unknown,
                             inputOptions: Partial<SimplifyJsonOptions> = {},
                             recursionLevel = 0,
                             visitedObjects = new Set<object>): SimplifiedType {

    const options = {...DEFAULT_SIMPLIFY_JSON_OPTIONS, ...inputOptions};
    if (recursionLevel > options.maxRecursionLevel) {
        return options.depthLimitValue;
    }
    value = simplifyValue(value);
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' || value === null || value === undefined) {
        return value;
    }
    if (visitedObjects.has(value)) {
        return options.circularReferenceValue;
    }
    visitedObjects.add(value);
    if (Array.isArray(value)) {
        if (value.length > options.maxArrayLength) {
            return options.arrayLengthLimitValue.replace('$length', `${value.length}`);
        }
        return value.map(v => simplifyJson(v, options, recursionLevel + 1, visitedObjects));
    }
    const entries = Object.entries(value);
    if (entries.length > options.maxObjectProperties) {
        return options.objectPropertyCountLimitValue.replace('$count', `${entries.length}`);
    }
    const result: Record<string, unknown> = {};
    for (const [propertyName, propertyValue] of entries) {
        if (recursionLevel === 0 && options.isIgnoredProperty(propertyName)) {
            continue;// Ignore the property. The property was moved to the top level.
        }
        result[propertyName] = simplifyJson(propertyValue, options, recursionLevel + 1, visitedObjects);
    }
    // Handle special properties.
    for (const propertyName of ERROR_OBJECT_PROPERTIES) {
        if (!result[propertyName] && !options.isIgnoredProperty(propertyName)) {
            const propertyValue = (value as Record<string, unknown>)[propertyName];
            if (propertyValue !== undefined) {
                result[propertyName] = simplifyJson(propertyValue, options, recursionLevel + 1, visitedObjects);
            }
        }
    }
    return result;
}

interface SimplifyValueOptions {
    functionValue: string;
    symbolValue: string;
}

export function simplifyValue(value: unknown, options: Partial<SimplifyValueOptions> = {}): SimplifiedType {
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
            return options.functionValue || DEFAULT_SIMPLIFY_JSON_OPTIONS.functionValue;
        case 'symbol':
            return options.symbolValue || DEFAULT_SIMPLIFY_JSON_OPTIONS.symbolValue;
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
