# logpipes

Transforms console.log ('debug', 'error', 'info', 'log', 'trace', 'warn') method output with chainable pipes.

Comes with a ready-to-use implementation of `JsonStringifyPipe` - a pipe that transforms console output into a single
serialized JSON string.

Usage example:

```typescript
installLogPipe(createJsonStringifyPipe());
console.log('Log after pipe is installed', {a: 1, b: 2, c: 3});
```

Produces a one-liner string with a serialized JSON:

```
'{"message":"Log after pipe is installed $1","$1":{"a":1,"b":2,"c":3},"@level":"log","@timestamp":"2023-07-03T17:13:56.018Z"}'
```

### JsonStringifyPipe parameters
```typescript
   /**
     * Maximum depth level in JSON before overriding the leaf value with a @depthLimitValue.
     * Default: 10.
     */
    maxDepthLimit: number;

    /**
     * All arrays with a number of elements greater the limit are serialized as a @arrayLengthLimitValue.
     * Default: 100.
     */
    maxArrayLength: number;

    /**
     * All objects with a number of properties greater the limit are serialized as a @objectPropertyCountLimitValue.
     * Default: 100.
     */
    maxObjectPropertyCount: number;

    /**
     * Excludes the property from the result.
     * Default: no properties are excluded.
     */
    isIgnoredProperty: (propertyName: string) => boolean;

    /**
     * Replaces property value with another value.
     * Can be used for value masking.
     * Default: no properties are replaced.
     */
    replacePropertyValue: (propertyName: string, propertyValue: unknown) => unknown;

    /**
     * A value used to stop recursion when @maxDepthLimit is reached.
     * Default: '[Depth limit ~]'.
     */
    depthLimitValue: string;

    /**
     * A value used to replace arrays with a number of elements > @maxArrayLength
     * Default: '[Array, length: $length ~]'.
     */
    arrayLengthLimitValue: string;

    /**
     * A value used to replace objects with a number of properties > @maxObjectPropertyCount.
     * Default: '[Object, properties: $count ~]'.
     */
    objectPropertyCountLimitValue: string;

    /**
     * A value used to replace a circular reference.
     * Default: '[Circular ~]'.
     */
    circularReferenceValue: string;

    /**
     * A value used to replace functions.
     * Default: '[Function ~]'.
     **/
    functionValue: string;

    /**
     * A value used to replace symbol values.
     * Default: '[Symbol ~]'.
     **/
    symbolValue: string;
```


