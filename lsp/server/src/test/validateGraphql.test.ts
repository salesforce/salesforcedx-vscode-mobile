/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateGraphql } from '../validateGraphql';
import * as assert from 'assert';
import { suite, test } from 'mocha';

suite('Diagnostics Test Suite - Server - Validate GraphQL', () => {
    test('Valid uiapi missing diagnostic', async () => {
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
        const diagnostics = await validateGraphql({}, textDocument);

        assert.equal(diagnostics.length, 1);
        assert.equal(diagnostics[0].message, 'uiapi is misspelled.');
    });

    test('Graphql with incorrect syntax produces no diagnostic', async () => {
        const textDocument = TextDocument.create(
            'file://test.js',
            'javascript',
            1,
            `
            export default class graphqlBatchTest extends LightningElement {

                gqlQuery = gql\`
                    query { 
                \`;

            };
            `
        );
        const diagnostics = await validateGraphql({}, textDocument);

        assert.equal(diagnostics.length, 0);
    });
});
