# logpipes

Transforms console.log ('debug', 'error', 'info', 'log', 'trace', 'warn') method output with chainable pipes.

Comes with a ready-to-use implementation of `JsonStringifyPipe` - a pipe that transforms console output into a single
serialized JSON string.

Usage example:

```typescript
installLogPipe(createJsonStringifyPipe());
console.log('Log after pipe is installed', {a: 1, b: 2, c: 3});
```

Produces a single line string with a serialized JSON:

```
'{"message":"Log after pipe is installed $1","$1":{"a":1,"b":2,"c":3},"@level":"log","@timestamp":"2023-07-03T17:13:56.018Z"}'
```

### JsonStringifyPipe parameters



