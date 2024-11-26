/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as assert from 'assert';
import { suite, test } from 'mocha';
import { ValidatorManager } from  '../../../../src/lsp/server/validatorManager';
import { MESSAGE_FOR_GET_RELATED_LIST_RECORDS, RULE_ID as LOCAL_CHANGE_NOT_AWARE_ADAPTERS } from '../../../../src/lsp/server/diagnostics/js/adapters-local-change-not-aware';

suite('Diagnostics Test Suite - Server - ValidatorManager', () => {
    const source = 'sample extension title';
    const validatorManager = ValidatorManager.createInstance(source);
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

    test('Validate JS file with local change not aware adapter', async () => {
        const diagnostics = await validatorManager.validateDocument(
            {},
            textDocument
        );
        assert.equal(diagnostics.length, 1);
        const diagnostic = diagnostics[0];
        assert.equal(
            diagnostic.message,
            MESSAGE_FOR_GET_RELATED_LIST_RECORDS
        );
        assert.equal(diagnostic.source, source);
        assert.equal(diagnostic.code, LOCAL_CHANGE_NOT_AWARE_ADAPTERS);
    });
});
