import {createJsonPipe, JsonPipeOptions} from './JsonPipe';
import {LogPipe} from './ConsoleOverrides';

/** JsonStringifyPipeOptions are the same as JsonPipeOptions today. */
export type JsonStringifyPipeOptions = JsonPipeOptions;

/** Creates a new pipe that will produce a JSON serialized into a single string as the result. */
export function createJsonStringifyPipe(inputOptions: Partial<JsonPipeOptions> = {}): LogPipe {
    const jsonPipe = createJsonPipe(inputOptions);
    return (level, ...args) => {
        const jsonPipeResult = jsonPipe(level, ...args);
        return jsonPipeResult.length === 0 ? [] : [JSON.stringify(jsonPipeResult[0])];
    };
}

