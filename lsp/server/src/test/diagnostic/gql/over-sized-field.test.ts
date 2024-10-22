/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { suite, test } from 'mocha';
import * as assert from 'assert';

import { parse } from 'graphql';
import { OversizedField } from '../../../diagnostic/gql/over-sized-field';
suite(
    'GraphQL Diagnostics Test Suite - Server - Oversized GraphQL Field',
    () => {
        test('Oversized rich text area field', async () => {
            const textDocument = TextDocument.create(
                '',
                'graphql',
                1,
                `
            query {
                uiapi {
                    query {
                        Gadget {
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
            const diagnostics = await new OversizedField().validateDocument(
                textDocument,
                astNode
            );
        });
    }
);
