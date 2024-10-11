/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as assert from 'assert';
import { MisspelledUiapi } from '../../../diagnostic/gql/misspelled-uiapi';
import {parse, ASTNode} from 'graphql';

describe('validateGraphql', () => {
    
    it('valid uiapi missing diagnostic', async () => {
        const textDocument = TextDocument.create(
            '',
            'graphql',
            1,
            `
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
            `
        );

        const astNode = parse(textDocument.getText());
        const diagnostics = await (new MisspelledUiapi).validateDocument(textDocument, astNode);
    
        assert.equal(diagnostics.length, 1);
        assert.equal(diagnostics[0].message, 'uiapi is misspelled.');
    });

});