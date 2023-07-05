# logpipes

Transforms console.log ('debug', 'error', 'info', 'log', 'trace', 'warn') method output with chainable pipes.

Comes with a ready-to-use implementation of different pipes, like `JsonStringifyPipe`: a pipe that transforms console
output into a single serialized JSON string.

TypeScript safe. Has zero external dependencies.

Usage example:

```typescript
installLogPipe(createJsonStringifyPipe());
console.log('Log after pipe is installed', {a: 1, b: 2, c: 3});
```

Produces a one-liner string with a serialized JSON:

```
'{"message":"Log after pipe is installed $1","$1":{"a":1,"b":2,"c":3},"level":"log","@timestamp":"2023-07-03T17:13:56.018Z"}'
```

### JsonStringifyPipe

JsonStringifyPipe accepts `JsonStringifyPipeOptions` which inherit all `JsonSimplifierOptions`.

See in-code docs for the available options:

- [JsonSimplifierOptions](https://github.com/mfursov/logpipes/tree/master/src/JsonSimplifier.ts)
- [JsonStringifyPipeOptions](https://github.com/mfursov/logpipes/tree/master/src/JsonStringifyPipe.ts)

Check [unit tests](https://github.com/mfursov/logpipes/tree/master/tests) for more examples.

### LogLevelFilterPipe

LogLevelFilterPipe excludes configured log levels from the final output.

See [LogLevelFilterPipeOptions](https://github.com/mfursov/logpipes/tree/master/src/LogLevelFilterPipe.ts) and
related [unit tests](https://github.com/mfursov/logpipes/tree/master/tests).
