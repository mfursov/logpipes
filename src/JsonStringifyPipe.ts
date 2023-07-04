import {DEFAULT_JSON_SIMPLIFIER_OPTIONS, JsonSimplifierOptions, simplifyJson, simplifyValue} from './JsonSimplifier';
import {LogLevel, LogPipe} from './ConsoleOverrides';

/** Options for JsonStringifyPipe. */
export interface JsonPipeOptions extends JsonSimplifierOptions {
    /**
     * Top-level property name that includes a concatenated message of all strings and primitive types passed to console.log.
     * Default: 'message'.
     */
    messagePropertyName: string;

    /**
     * Log level property name.
     * If <null>, no log level info is added to the result JSON.
     * Default: 'level'.
     */
    levelPropertyName: string | null;

    /** Log level value formatter. User only if @levelPropertyName is not <null>. */
    levelPropertyFormatter: (level: LogLevel) => string;

    /**
     * Timestamp property name.
     * If <null>, no timestamp is added to the result JSON.
     * Default: '@timestamp'.
     */
    timestampPropertyName: string | null;

    /** Timestamp formatter. User only if @timestampPropertyName is not <null>. */
    timestampPropertyFormatter: (timeInMillis: number) => string;

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
}

export const DEFAULT_JSON_PIPE_OPTIONS: Readonly<JsonPipeOptions> = {
    ...DEFAULT_JSON_SIMPLIFIER_OPTIONS,
    messagePropertyName: 'message',

    levelPropertyName: 'level',
    levelPropertyFormatter: level => level,

    timestampPropertyName: '@timestamp',
    timestampPropertyFormatter: timeInMillis => new Date(timeInMillis).toISOString(),

    isTopLevelProperty: propertyName => propertyName.startsWith('@'),
    isIgnoredProperty: () => false,
    getObjectArgumentMessageToken: argumentIndex => `$${argumentIndex + 1}`,
    undefinedMessageValue: undefined,
};

export function createJsonStringifyPipe(inputOptions: Partial<JsonPipeOptions> = {}): LogPipe {
    const options: JsonPipeOptions = {...DEFAULT_JSON_PIPE_OPTIONS, ...inputOptions};
    const topLevelPickerOptions: PickTopLevelPropertiesOptions = {
        isTopLevelProperty: options.isTopLevelProperty,
        ignoredPropertyNames: [options.messagePropertyName],
    };
    return (level, ...args) => {
        const resultJson: Record<string, unknown> = {};
        let message: string | undefined = undefined;
        resultJson[options.messagePropertyName] = undefined; // Set it first, so it will be the first property in JSON.
        let messageArgIndex = 0;
        for (let argIndex = 0; argIndex < args.length; argIndex++) {
            const arg = simplifyValue(args[argIndex]);
            let messageToken = arg;
            if (typeof arg === 'object' && arg !== null) {
                const topLevelProperties = pickTopLevelProperties(arg, topLevelPickerOptions);
                for (const [topLevelPropertyName, topLevelPropertyValue] of Object.entries(topLevelProperties)) {
                    resultJson[topLevelPropertyName] = topLevelPropertyValue;
                }
                messageToken = options.getObjectArgumentMessageToken(messageArgIndex, arg);
                // Add top-level properties to the list of ignored when calling convertToSafeJson.
                const simplifyOptions: JsonSimplifierOptions = {
                    ...options,
                    isIgnoredProperty: name => options.isIgnoredProperty(name) || name in topLevelProperties
                };
                resultJson[messageToken] = simplifyJson(arg, simplifyOptions);
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
            resultJson[options.messagePropertyName] = message;
        }
        if (options.levelPropertyName) {
            resultJson[options.levelPropertyName] = options.levelPropertyFormatter(level);
        }
        if (options.timestampPropertyName) {
            resultJson[options.timestampPropertyName] = options.timestampPropertyFormatter(Date.now());
        }
        return [JSON.stringify(resultJson)];
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
