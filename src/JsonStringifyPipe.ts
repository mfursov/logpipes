import {createJsonPipe, getDefaultJsonPipeOptions, JsonPipe, JsonPipeOptions} from './JsonPipe';
import {LogPipe} from './ConsoleOverrides';

/** JsonStringifyPipeOptions are the same as JsonPipeOptions today. */
export interface JsonStringifyPipeOptions extends JsonPipeOptions {
    /**
     * A callback called for the result JSON object before the final object serialization into a string.
     * This may be a good place to add more fields into the JSON.
     * Default: an empty function that does nothing.
     */
    preStringifyCallback: (jsonBeforeStringify: Record<string, unknown>) => void;
}

/** Returns default properties used by 'createJsonStringifyPipe'. */
export function getDefaultJsonStringifyPipeOptions(): JsonStringifyPipeOptions {
    return {
        ...getDefaultJsonPipeOptions(),
        preStringifyCallback: (): void => {},
    };
}

export type JsonStringifyPipe = JsonPipe;

/** Creates a new pipe that will produce a JSON serialized into a single string as a result. */
export function createJsonStringifyPipe(inputOptions: Partial<JsonStringifyPipeOptions> = {}): JsonStringifyPipe {
    const options = {...getDefaultJsonStringifyPipeOptions(), ...inputOptions};
    const jsonPipe = createJsonPipe(options);
    const logPipe: LogPipe = (level, ...args) => {
        const jsonPipeResult = jsonPipe(level, ...args) as Array<Record<string, unknown>>;
        if (jsonPipeResult.length === 0) {
            return [];
        }
        const json = jsonPipeResult[0];
        options.preStringifyCallback(json);
        return [JSON.stringify(json)];
    };
    const jsonStringifyPipe = logPipe as JsonStringifyPipe;
    jsonStringifyPipe.getLastMessageId = jsonPipe.getLastMessageId;
    return jsonStringifyPipe;
}

