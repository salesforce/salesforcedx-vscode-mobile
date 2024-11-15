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
    URL_FOR_GET_RELATED_LIST_RECORDS_EXTERNAL_DOC,
    MESSAGE_FOR_GET_RELATED_LIST_RECORDS,
    MESSAGE_FOR_GET_RELATED_LIST_COUNT
} from '../../../src/diagnostic/js/adapters-local-change-not-aware';
import { parseJs } from '../../../src/utils/babelUtil';
import { TextDocument } from 'vscode-languageserver-textdocument';

suite(
    'JS Diagnostics Test Suite - Server - Adapter Local Change Not Aware',
    () => {
        const rule = new AdaptersLocalChangeNotAware();

        afterEach(function () {
            sinon.restore();
        });

        test('Wire "getRelatedRecords" produces local-change-not-aware diagnostic', async () => {
            const jsCode = `
                import { LightningElement, wire } from "lwc";
                import { getRelatedListRecords } from "lightning/uiRelatedListApi";

                export default class RelatedListRecords extends LightningElement {
                    @wire(getRelatedListRecords, {})
                    relatedListHandler({ error, data }) {
                    }
                }
            `;
            const textDocument = TextDocument.create(
                'file://test.js',
                'javascript',
                1,
                jsCode
            );
            const jsAstNode = parseJs(textDocument.getText());
            const diagnostics = await rule.validateDocument(
                textDocument,
                jsAstNode
            );

            assert.equal(diagnostics.length, 1);
            const { range, message, code } = diagnostics[0];

            const startOffset = textDocument.offsetAt(range.start);
            const endOffset = textDocument.offsetAt(range.end);

            const targetString = jsCode.substring(startOffset, endOffset);

            assert.equal(targetString, 'getRelatedListRecords');
            assert.equal(message, MESSAGE_FOR_GET_RELATED_LIST_RECORDS);
            assert.equal(code, URL_FOR_GET_RELATED_LIST_RECORDS_EXTERNAL_DOC);
        });

        test('Wire "getRelatedListCount" produces local-change-not-aware diagnostic', async () => {
            const jsCode = `
                import { LightningElement, wire } from "lwc";
                import { getRelatedListCount } from "lightning/uiRelatedListApi";

                export default class GetRelatedListCount extends LightningElement {
                    @wire(getRelatedListCount, {})
                    relatedListHandler({ error, data }) {
                    }
                }
            `;
            const textDocument = TextDocument.create(
                'file://test.js',
                'javascript',
                1,
                jsCode
            );
            const jsAstNode = parseJs(textDocument.getText());
            const diagnostics = await rule.validateDocument(
                textDocument,
                jsAstNode
            );

            assert.equal(diagnostics.length, 1);
            const { range, message, code } = diagnostics[0];

            const startOffset = textDocument.offsetAt(range.start);
            const endOffset = textDocument.offsetAt(range.end);

            const targetString = jsCode.substring(startOffset, endOffset);

            assert.equal(targetString, 'getRelatedListCount');
            assert.equal(message, MESSAGE_FOR_GET_RELATED_LIST_COUNT);
            assert.equal(code, undefined);
        });
    }
);
