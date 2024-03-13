# logpipes

Transforms console.log ('debug', 'error', 'info', 'log', 'trace', 'warn') method output with chainable pipes.

Comes with a ready-to-use implementation of different pipes, like 'JsonStringifyPipe': a pipe that transforms console
output into a single serialized JSON string.

TypeScript safe. Has zero external dependencies.

Usage example:

```typescript
import {installConsoleOverrides} from 'logpipes';

installConsoleOverrides(createJsonStringifyPipe());
console.log('Log after pipe is installed', {a: 1, b: 2, c: 3});
```

Produces a one-liner string with a serialized JSON:

```
'{"message":"Log after pipe is installed $1","$1":{"a":1,"b":2,"c":3},"level":"log","timestamp":"2023-07-03T17:13:56.018Z","id":"current-log-message-uuid"}'
```

## Pipes

### JsonPipe

JsonPipe converts console log arguments into a single serializable JSON object.

The pipe accepts `JsonPipeOptions` which inherits all `JsonSimplifierOptions`.

See in-code docs for the available options:

- [JsonSimplifierOptions](https://github.com/mfursov/logpipes/tree/master/src/JsonSimplifier.ts)
- [JsonPipeOptions](https://github.com/mfursov/logpipes/tree/master/src/JsonPipe.ts)

Check [unit tests](https://github.com/mfursov/logpipes/tree/master/tests) for more examples.

### JsonStringifyPipe

JsonStringifyPipe calls JsonPipe and converts the result JSON object into a single line string.

See docs for `JsonPipe` for more details.

### LogLevelFilterPipe

LogLevelFilterPipe excludes configured log levels from the final output.

See [LogLevelFilterPipeOptions](https://github.com/mfursov/logpipes/tree/master/src/LogLevelFilterPipe.ts) and
related [unit tests](https://github.com/mfursov/logpipes/tree/master/tests/LogLevelFilterPipe.jest.ts).

### LogMessageFilterPipe

LogMessageFilterPipe excludes configured all log events with a specified tokens in the message.

See [LogMessageFilterPipeOptions](https://github.com/mfursov/logpipes/tree/master/src/LogMessageFilterPipe.ts) and
related [unit tests](https://github.com/mfursov/logpipes/tree/master/tests/LogMessageFilterPipe.jest.ts).

### LogCachePipe

LogCachePipe caches console messages and provides access to the cache.

This pipe can be used to dump or sideload all console log messages.

See [LogCachePipeOptions](https://github.com/mfursov/logpipes/tree/master/src/LogCachePipe.ts) and
related [unit tests](https://github.com/mfursov/logpipes/tree/master/tests/LogCachePipe.jest.ts).

### DateTimePipe

Adds a timestamp as the first parameter to every console message.

### NoopPipe

NoopPipe does nothing and proxies all parameters to the next pipe with no changes.

It can be used to reduce a client-side boilerplate code.

## Utility methods and types

- [LogPipe](https://github.com/mfursov/logpipes/blob/master/src/ConsoleOverrides.ts)
- [installConsoleOverrides](https://github.com/mfursov/logpipes/blob/master/src/ConsoleOverrides.ts)
- [uninstallConsoleOverrides](https://github.com/mfursov/logpipes/blob/master/src/ConsoleOverrides.ts)
- [uninstallAllConsoleOverrides](https://github.com/mfursov/logpipes/blob/master/src/ConsoleOverrides.ts)
- [getConsoleOverrides](https://github.com/mfursov/logpipes/blob/master/src/ConsoleOverrides.ts)
- [getOriginalConsoleMethods](https://github.com/mfursov/logpipes/blob/master/src/ConsoleOverrides.ts)
- [simplifyJson](https://github.com/mfursov/logpipes/blob/master/src/JsonSimplifier.ts)
- [simplifyValue](https://github.com/mfursov/logpipes/blob/master/src/JsonSimplifier.ts)

