/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as assert from 'assert';
import { suite, test } from 'mocha';

import { JSValidator } from '../../validator/jsValidator';
import {
    AdaptersLocalChangeNotAware,
    MESSAGE_FOR_GET_RELATED_LIST_RECORDS,
    RULE_ID
} from '../../diagnostic/js/adapters-local-change-not-aware';

suite('Diagnostics Test Suite - Server - JS Validator', () => {
    const jsValidator = new JSValidator();
    jsValidator.addProducer(new AdaptersLocalChangeNotAware());

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

    test('Validate local change not aware adapters', async () => {
        const jsSections = jsValidator.gatherDiagnosticSections(textDocument);
        assert.equal(jsSections.length, 1);
        const diagnostics = await jsValidator.validateData(
            {},
            jsSections[0].document,
            jsSections[0].data
        );
        assert.equal(diagnostics.length, 1);
        assert.equal(
            diagnostics[0].message,
            MESSAGE_FOR_GET_RELATED_LIST_RECORDS
        );
        assert.equal(diagnostics[0].data, RULE_ID);
    });

    test('No diagnostics return if individually suppressed', async () => {
        const jsSections = jsValidator.gatherDiagnosticSections(textDocument);

        const diagnostics = await jsValidator.validateData(
            { suppressByRuleId: new Set([RULE_ID]) },
            jsSections[0].document,
            jsSections[0].data
        );

        assert.equal(diagnostics.length, 0);
    });

    test('No diagnostics return if all suppressed', async () => {
        const jsSections = jsValidator.gatherDiagnosticSections(textDocument);

        const diagnostics = await jsValidator.validateData(
            { suppressAll: true },
            jsSections[0].document,
            jsSections[0].data
        );

        assert.equal(diagnostics.length, 0);
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
        const jsSections = jsValidator.gatherDiagnosticSections(textDocument);

        assert.equal(jsSections.length, 0);
    });
});
