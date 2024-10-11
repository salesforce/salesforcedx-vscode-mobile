/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as assert from 'assert';
import { LOCAL_CHANGE_NOT_AWARE_MESSAGE } from '../diagnostic/js/adapters-local-change-not-aware';

import { suite, test } from 'mocha';
import { validateDocument } from '../validateDocument';

/**
 * Verify validateDocument calls into js, graphql and html diagnostic rule.
 */
suite('Diagnostics Test Suite - Server - Validate Document', () => {
    test('Call in validateGraphql', async () => {
        const textDocument = TextDocument.create(
            'file://test.js',
            'javascript',
            1,
            `
            export default class graphqlBatchTest extends LightningElement {

                gqlQuery = gql\`
                    query {
                        uiapia {
                            query {
                                Account {
                                    edges {
                                        node {
                                            Name { value }
                                        }
                                    }
                                }
                            }
                        }
                    }   
                \`;

            };
            `
        );
        const source = 'xyz';
        const diagnostics = await validateDocument(textDocument, source);

        assert.equal(diagnostics.length, 1);
        const diagnostic = diagnostics[0];
        assert.equal(diagnostic.message, 'uiapi is misspelled.');
        assert.equal(diagnostic.source, source);
    });

    test('Call in validateJs', async () => {
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
        const source = 'xyz';
        const diagnostics = await validateDocument(textDocument, source);

        assert.equal(diagnostics.length, 1);
        const diagnostic = diagnostics[0];
        assert.equal(diagnostic.message, LOCAL_CHANGE_NOT_AWARE_MESSAGE);
        assert.equal(diagnostic.source, source);
    });

    it('Call in validateHtml', async () => {
        //TODO: to be implemented
    });
});
