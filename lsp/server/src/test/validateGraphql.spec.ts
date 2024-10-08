/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateGraphql } from '../validateGraphql';

describe('validateGraphql', () => {
    
    it('valid uiapi missing diagnostic', async () => {
        const textDocument = TextDocument.create(
            'file://test.js',
            'javascript',
            1,
            `
            import { LightningElement, wire, track, api } from 'lwc';
            import {gql, graphql} from "lightning/uiGraphQLApi";
            export default class graphqlBatchTest extends LightningElement {

                gqlQuery = gql\`
                    query {
                        uiapi {
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
        const diagnostics = await validateGraphql(100, textDocument, textDocument.getText());
    

    });

});