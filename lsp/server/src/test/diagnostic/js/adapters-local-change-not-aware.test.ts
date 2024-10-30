/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import { suite, test, afterEach } from 'mocha';

import {
    AdaptersLocalChangeNotAware,
    LOCAL_CHANGE_NOT_AWARE_EXTERNAL_DOC_URL
} from '../../../diagnostic/js/adapters-local-change-not-aware';
import { parseJs } from '../../../utils/babelUtil';
import { TextDocument } from 'vscode-languageserver-textdocument';

suite(
    'JS Diagnostics Test Suite - Server - Adapter Local Change Not Aware',
    () => {
        const rule = new AdaptersLocalChangeNotAware();

        afterEach(function () {
            sinon.restore();
        });

        test('Wire "getRelatedRecords" produces local-change-not-aware diagnostic', async () => {
            const js = `
                import { LightningElement, wire } from "lwc";
                import { getRelatedListRecords } from "lightning/uiRelatedListApi";

                export default class RelatedListRecords extends LightningElement {
                    @wire(getRelatedListRecords, {})
                    onResultHandler({ error, data }) {
                    };
                }
            `;
            const textDocument = TextDocument.create(
                'file://test.js',
                'javascript',
                1,
                js
            );
            const jsAstNode = parseJs(js);
            const diagnostics = await rule.validateDocument(
                textDocument,
                jsAstNode
            );

            assert.equal(diagnostics.length, 1);
            const { range, codeDescription } = diagnostics[0];

            const startOffset = textDocument.offsetAt(range.start);
            const endOffset = textDocument.offsetAt(range.end);

            const targetString = js.substring(startOffset, endOffset);

            assert.equal(targetString, 'getRelatedListRecords');
            assert.equal(
                codeDescription?.href,
                LOCAL_CHANGE_NOT_AWARE_EXTERNAL_DOC_URL
            );
        });

        test('Wire "getRelatedListCount" produces local-change-not-aware diagnostic', async () => {
            const js = `
                import { LightningElement, wire } from "lwc";
                import { getRelatedListCount } from "lightning/uiRelatedListApi";

                export default class RelatedListRecords extends LightningElement {
                    @wire(getRelatedListCount, {})
                    onResultHandler({ error, data }) {
                    };
                }
            `;
            const textDocument = TextDocument.create(
                'file://test.js',
                'javascript',
                1,
                js
            );
            const jsAstNode = parseJs(js);
            const diagnostics = await rule.validateDocument(
                textDocument,
                jsAstNode
            );

            assert.equal(diagnostics.length, 1);
            const { range, codeDescription } = diagnostics[0];

            const startOffset = textDocument.offsetAt(range.start);
            const endOffset = textDocument.offsetAt(range.end);

            const targetString = js.substring(startOffset, endOffset);

            assert.equal(targetString, 'getRelatedListCount');
            assert.equal(
                codeDescription?.href,
                LOCAL_CHANGE_NOT_AWARE_EXTERNAL_DOC_URL
            );
        });
    }
);
