/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { suite, test, afterEach } from 'mocha';
import { parseJs } from '../../src/utils/babelUtil';

suite('BabelUtil Test Suite - Server', () => {
    afterEach(function () {
        sinon.restore();
    });

    test('Parse valid js correctly', () => {
        const node = parseJs(`
          import { LightningElement, wire } from "lwc";
          import { getRelatedListRecords } from "lightning/uiRelatedListApi";
        `);

        assert.equal(node.type, 'File');
    });

    test('Throw exception for invalid js code', () => {
        assert.throws(
            () => {
                parseJs('var var i=100;');
            },
            {
                code: 'BABEL_PARSER_SYNTAX_ERROR',
                reasonCode: 'UnexpectedKeyword'
            }
        );
    });
});
