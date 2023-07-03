import {LogPipe} from './ConsoleOverrides';
import {DEFAULT_JSON_SIMPLIFIER_OPTIONS, JsonSimplifierOptions, simplifyJson, simplifyValue} from './JsonSimpiler';

export interface JsonPipeOptions extends JsonSimplifierOptions {
    messagePropertyName: string;
    getObjectArgumentMessageToken: (argumentIndex: number, argument: object) => string;
    undefinedMessageValue: undefined | string;
    isTopLevelProperty: (propertyName: string) => boolean;
    isIgnoredProperty: (propertyName: string) => boolean;
}

export const DEFAULT_JSON_PIPE_OPTIONS: Readonly<JsonPipeOptions> = {
    ...DEFAULT_JSON_SIMPLIFIER_OPTIONS,
    messagePropertyName: '@message',
    isTopLevelProperty: propertyName => propertyName.startsWith('@'),
    isIgnoredProperty: () => false,
    getObjectArgumentMessageToken: argumentIndex => `$${argumentIndex + 1}`,
    undefinedMessageValue: undefined,
};

export function createJsonPipe(inputOptions: Partial<JsonPipeOptions> = {}): LogPipe {
    const options: JsonPipeOptions = {...DEFAULT_JSON_PIPE_OPTIONS, ...inputOptions};
    const topLevelPickerOptions: PickTopLevelPropertiesOptions = {
        isTopLevelProperty: options.isTopLevelProperty,
        ignoredPropertyNames: [options.messagePropertyName],
    };
    return (type, ...args) => {
        const result: Record<string, unknown> = {};
        let message: string | undefined = undefined;
        result[options.messagePropertyName] = undefined; // Set it first, so it will be the first property in JSON.
        let messageArgIndex = 0;
        for (let argIndex = 0; argIndex < args.length; argIndex++) {
            const arg = simplifyValue(args[argIndex]);
            let messageToken = arg;
            if (typeof arg === 'object' && arg !== null) {
                const topLevelProperties = pickTopLevelProperties(arg, topLevelPickerOptions);
                for (const [topLevelPropertyName, topLevelPropertyValue] of Object.entries(topLevelProperties)) {
                    result[topLevelPropertyName] = topLevelPropertyValue;
                }
                messageToken = options.getObjectArgumentMessageToken(messageArgIndex, arg);
                // Add top-level properties to the list of ignored when calling convertToSafeJson.
                const simplifyOptions: JsonSimplifierOptions = {
                    ...options,
                    isIgnoredProperty: name => options.isIgnoredProperty(name) || name in topLevelProperties
                };
                result[messageToken] = simplifyJson(arg, simplifyOptions);
                messageArgIndex++;
            } else if (arg === undefined) {
                if (options.undefinedMessageValue !== undefined) {
                    messageToken += options.undefinedMessageValue;
                }
            } else {
                messageToken = arg;
            }
            message = message === undefined ? `${messageToken}` : `${message} ${messageToken}`;
        }
        if (message) {
            result[options.messagePropertyName] = message;
        }
        return [type, JSON.stringify(result)];
    };
}

export interface PickTopLevelPropertiesOptions {
    isTopLevelProperty: (propertyName: string) => boolean;
    ignoredPropertyNames: string[];
}

export function pickTopLevelProperties(obj: object,
                                       inputOptions: Partial<PickTopLevelPropertiesOptions> = {}
): Record<string, unknown> {
    const options = {
        isTopLevelProperty: DEFAULT_JSON_PIPE_OPTIONS.isTopLevelProperty,
        ignoredPropertyNames: [],
        ...inputOptions,
    };
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (options.isTopLevelProperty(key) && !options.ignoredPropertyNames.includes(key)) {
            result[key] = value;
        }
    }
    return result;
}
