/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as assert from 'assert';
import { suite, test } from 'mocha';
import { validateJs } from '../validateJs';
import { LOCAL_CHANGE_NOT_AWARE_MESSAGE } from '../diagnostic/js/adapters-local-change-not-aware';

suite('Diagnostics Test Suite - Server - Validate JS', () => {
    test('Validate local change not aware adapters', async () => {
        const textDocument = TextDocument.create(
            'file://test.js',
            'javascript',
            1,
            `
            import { LightningElement, wire } from "lwc";
            import { getRelatedListRecords } from "lightning/uiRelatedListApi";

            export default class RelatedListRecords extends LightningElement {

                recordId = "0015g00000XYZABC";

                relatedRecords;

                @wire(getRelatedListRecords, {
                    parentRecordId: "$recordId", 
                    relatedListId: "Opportunities",
                    fields: ["Opportunity.Name"],
                })
                relatedListHandler({ error, data }) {
                }
            }
         `
        );
        const diagnostics = await validateJs(textDocument, 100);

        assert.equal(diagnostics.length, 1);
        assert.equal(diagnostics[0].message, LOCAL_CHANGE_NOT_AWARE_MESSAGE);
    });

    test('Js with incorrect syntax produces no diagnostic', async () => {
        const textDocument = TextDocument.create(
            'file://test.js',
            'javascript',
            1,
            `
             var var i = 100;
            `
        );
        const diagnostics = await validateJs(textDocument, 100);

        assert.equal(diagnostics.length, 0);
    });
});
