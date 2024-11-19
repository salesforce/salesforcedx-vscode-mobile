/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { suite, test, beforeEach, afterEach } from 'mocha';
import * as Book__c from '../../testFixture/objectInfos/Book__c.json';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { parse } from 'graphql';
import {
    OversizedRecord,
    OVER_SIZED_FIELD_MESSAGE,
    OVER_SIZED_RECORD_MESSAGE
} from '../../../../../../src/lsp/server/diagnostics/gql/over-sized-record';
import { OrgUtils } from '../../../../../../src/lsp/server/utils/orgUtils';

import { ObjectInfoRepresentation } from '../../../../../../src/lsp/server/types';

suite(
    'GraphQL Diagnostics Test Suite - Server - Oversized GraphQL Field',
    () => {
        let oversizedRecordProducer = new OversizedRecord();

        let sandbox: sinon.SinonSandbox;
        beforeEach(function () {
            sandbox = sinon.createSandbox();
            sandbox
                .stub(OrgUtils, 'getObjectInfo')
                .resolves(Book__c as unknown as ObjectInfoRepresentation);
        });

        afterEach(function () {
            sandbox.restore();
        });

        test('No oversized diagnostics when total field size does not exceed 32k', async () => {
            const textDocument = TextDocument.create(
                '',
                'graphql',
                1,
                `
                query {
                    uiapi {
                        query {
                            Book__c {
                                edges {
                                    node {
                                        Name { value }
                                        Chapter1__c {
                                        value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }   
                `
            );
            const astNode = parse(textDocument.getText());
            const diagnostics = await oversizedRecordProducer.validateDocument(
                textDocument,
                astNode
            );
            assert.equal(diagnostics.length, 0);
        });

        test('Two oversized diagnostics are created when 1 field size exceed 32k', async () => {
            const textDocument = TextDocument.create(
                '',
                'graphql',
                1,
                `
                query {
                    uiapi {
                        query {
                            Book__c {
                                edges {
                                    node {
                                        Name { value }
                                        Chapter4__c {
                                        value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }   
                `
            );
            const astNode = parse(textDocument.getText());
            const diagnostics = await oversizedRecordProducer.validateDocument(
                textDocument,
                astNode
            );
            assert.equal(diagnostics.length, 2);
            assert.strictEqual(
                diagnostics[0].message,
                OVER_SIZED_FIELD_MESSAGE
            );
            assert.strictEqual(
                diagnostics[1].message,
                OVER_SIZED_RECORD_MESSAGE
            );
        });

        test('1 oversized diagnostics is created when all 3 field size exceed 32k', async () => {
            const textDocument = TextDocument.create(
                '',
                'graphql',
                1,
                `
                query {
                    uiapi {
                        query {
                            Book__c {
                                edges {
                                    node {
                                        Chapter1__c  {
                                            value
                                        }    
                                        Chapter2__c {
                                            value
                                        }
                                        Chapter3__c {
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }   
                `
            );
            const astNode = parse(textDocument.getText());
            const diagnostics = await oversizedRecordProducer.validateDocument(
                textDocument,
                astNode
            );
            assert.equal(diagnostics.length, 1);

            assert.strictEqual(
                diagnostics[0].message,
                OVER_SIZED_RECORD_MESSAGE
            );
        });
    }
);
