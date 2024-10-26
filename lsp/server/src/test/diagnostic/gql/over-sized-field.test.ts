/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { suite, test, beforeEach, afterEach } from 'mocha';
import Account from '../../../../testFixture/objectInfos/Account.json';
import User from '../../../../testFixture/objectInfos/User.json';
import Contact from '../../../../testFixture/objectInfos/Contact.json';
import * as assert from 'assert';
import * as sinon from 'sinon';

import { parse } from 'graphql';
import { OversizedRecord } from '../../../diagnostic/gql/over-sized-record';
import { OrgUtils } from '../../../utils/orgUtils';
import { ObjectInfoRepresentation } from '../../../types';
suite(
    'GraphQL Diagnostics Test Suite - Server - Oversized GraphQL Field',
    () => {
        let sandbox: sinon.SinonSandbox;
        beforeEach(function () {
            sandbox = sinon.createSandbox();
        });

        afterEach(function () {
            sandbox.restore();
        });

        test('Oversized rich text area field', async () => {
            const getObjectInfoStub = sandbox.stub(OrgUtils, 'getObjectInfo');
            getObjectInfoStub
                .onCall(0)
                .resolves(Account as unknown as ObjectInfoRepresentation);
            getObjectInfoStub
                .onCall(1)
                .resolves(Contact as unknown as ObjectInfoRepresentation);
            getObjectInfoStub
                .onCall(2)
                .resolves(User as unknown as ObjectInfoRepresentation);

            const textDocument = TextDocument.create(
                '',
                'graphql',
                1,
                `
            query {
                uiapi {
                    query {
                        Account {
                            edges {
                                node {
                                    Name { value }
                                    Contacts {
                                      edges {
                                        node {
                                          Name {
                                            value
                                          }
                                          
                                        }
                                      }
                                    }
                                    LastModifiedBy {
                                       Name {
                                         value
                                       }
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
            const diagnostics = await new OversizedRecord().validateDocument(
                textDocument,
                astNode
            );
            assert.equal(diagnostics.length, 0);
        });
    }
);
