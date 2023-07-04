# logpipes

Transforms console.log ('debug', 'error', 'info', 'log', 'trace', 'warn') method output with chainable pipes.

Comes with a ready-to-use implementation of `JsonStringifyPipe` - a pipe that transforms console output into a single
serialized JSON string.

TypeScript safe. Has zero external dependencies.

Usage example:

```typescript
installLogPipe(createJsonStringifyPipe());
console.log('Log after pipe is installed', {a: 1, b: 2, c: 3});
```

Produces a one-liner string with a serialized JSON:

```
'{"message":"Log after pipe is installed $1","$1":{"a":1,"b":2,"c":3},"@level":"log","@timestamp":"2023-07-03T17:13:56.018Z"}'
```

### JsonStringifyPipe options (JsonPipeOptions)

Inherited from `JsonSimplifierOptions`

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

Pipe specific options (`JsonPipeOptions`).

```typescript
/**
 * Top-level property name that includes a concatenated message of all strings and primitive types passed to console.log.
 * Default: 'message'.
 */
messagePropertyName: string;

/**
 * Timestamp property name.
 * If <null>, no timestamp is added to the result JSON.
 * Default: '@timestamp'.
 */
timestampPropertyName: string | null;

/** Timestamp formatter. User only if @timestampPropertyName is not <null>. */
timestampPropertyFormatter: (timeInMillis: number) => string;

/**
 * Log level property name.
 * If <null>, no log level info is added to the result JSON.
 * Default: '@level'.
 */
levelPropertyName: string | null;

/** Log level value formatter. User only if @levelPropertyName is not <null>. */
levelPropertyFormatter: (level: LogLevel) => string;

/**
 *  Builds object token for the message.
 *  By default, uses '$N' as a pattern where 'N' is positional a number of the console.log argument
 *  not inlined into the message.
 */
getObjectArgumentMessageToken: (argumentIndex: number, argument: object) => string;

/**
 * Used to provide a default value to reveal present but undefined fields.
 * The default value is <undefined> which results the fields with undefined value be excluded from the log.
 */
undefinedMessageValue: undefined | string;

/**
 * If an object parameter of console.log() contains a top-level property marked as isTopLevelProperty,
 * the property is moved from the object to the top-level JSON
 * (same level as 'message', '@timestamp', '@level' fields).
 */
isTopLevelProperty: (propertyName: string) => boolean;
```


