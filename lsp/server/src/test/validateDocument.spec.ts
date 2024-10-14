/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as assert from 'assert';
import { validateDocument } from '../validateDocument';

/**
 * Verify validateDocument calls into js, graphql and html diagnostic rule. 
 */
describe('validateDocument', () => {
    
    it('call in validateGraphql', async () => {
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
        const source = "xyz";
        const diagnostics = await validateDocument(textDocument, source);
    
        assert.equal(diagnostics.length, 1);
        const diagnostic = diagnostics[0];
        assert.equal(diagnostic.message, 'uiapi is misspelled.')
        assert.equal(diagnostic.source, source);
    });

    it('call in validateJs', async () => {
        //TODO: to be implemented
    });

    
    it('call in validateHtml', async () => {
        //TODO: to be implemented
    });
});