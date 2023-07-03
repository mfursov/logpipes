export interface JsonSimplifierOptions {
    maxRecursionLevel: number;
    maxArrayLength: number;
    maxObjectPropertyCount: number;
    isIgnoredProperty: (propertyName: string) => boolean;
    replacePropertyValue: (propertyName: string, propertyValue: unknown) => unknown;
    depthLimitValue: string;
    arrayLengthLimitValue: string;
    objectPropertyCountLimitValue: string;
    circularReferenceValue: string;
    functionValue: string;
    symbolValue: string;
}

export const DEFAULT_JSON_SIMPLIFIER_OPTIONS: Readonly<JsonSimplifierOptions> = {
    maxRecursionLevel: 10,
    maxArrayLength: 100,
    maxObjectPropertyCount: 100,
    isIgnoredProperty: () => false,
    replacePropertyValue: (_, value) => value,
    depthLimitValue: '[Depth limit ~]',
    arrayLengthLimitValue: '[Array, length: $length ~]',
    objectPropertyCountLimitValue: '[Object, properties: $count ~]',
    circularReferenceValue: '[Circular ~]',
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
                             inputOptions: Partial<JsonSimplifierOptions> = {},
                             recursionLevel = 0,
                             visitedObjects = new Set<object>): SimplifiedType {

    const options = {...DEFAULT_JSON_SIMPLIFIER_OPTIONS, ...inputOptions};
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
    if (entries.length > options.maxObjectPropertyCount) {
        return options.objectPropertyCountLimitValue.replace('$count', `${entries.length}`);
    }
    const simplifiedJson: Record<string, unknown> = {};
    for (const [propertyName, propertyValue] of entries) {
        if (recursionLevel === 0 && options.isIgnoredProperty(propertyName)) {
            continue;// Ignore the property. The property was moved to the top level.
        }
        simplifiedJson[propertyName] = simplifyJson(propertyValue, options, recursionLevel + 1, visitedObjects);
    }
    // Handle special properties.
    for (const propertyName of ERROR_OBJECT_PROPERTIES) {
        if (!simplifiedJson[propertyName] && !options.isIgnoredProperty(propertyName)) {
            const propertyValue = (value as Record<string, unknown>)[propertyName];
            if (propertyValue !== undefined) {
                simplifiedJson[propertyName] = simplifyJson(propertyValue, options, recursionLevel + 1, visitedObjects);
            }
        }
    }
    if (options.replacePropertyValue !== DEFAULT_JSON_SIMPLIFIER_OPTIONS.replacePropertyValue) {
        for (const [propertyName, propertyValue] of Object.entries(simplifiedJson)) {
            simplifiedJson[propertyName] = options.replacePropertyValue(propertyName, propertyValue);
        }
    }
    return simplifiedJson;
}

interface SimplifyValueOptions {
    functionValue: string;
    symbolValue: string;
}

/** Simplifies a single property value with no recursion. */
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
            return options.functionValue || DEFAULT_JSON_SIMPLIFIER_OPTIONS.functionValue;
        case 'symbol':
            return options.symbolValue || DEFAULT_JSON_SIMPLIFIER_OPTIONS.symbolValue;
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
