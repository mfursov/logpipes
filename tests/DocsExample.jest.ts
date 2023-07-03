import {describe, it} from '@jest/globals';
import {createJsonStringifyPipe, installConsoleOverride} from '../src';

describe('Docs example compilation test', () => {
    it('minimal', () => {
        installConsoleOverride(createJsonStringifyPipe());
        console.log('Log after pipe is installed', {a: 1, b: 2, c: 3});
    });
});
