/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { GraphQLValidator } from '../../validator/gqlValidator';
import {
    OversizedRecord,
    RULE_ID
} from '../../diagnostic/gql/over-sized-record';

import * as assert from 'assert';
import { suite, test, beforeEach, afterEach } from 'mocha';
import * as sinon from 'sinon';
import { OrgUtils } from '../../utils/orgUtils';
import Book__c from '../../../testFixture/objectInfos/Book__c.json';
import { ObjectInfoRepresentation } from '../../types';

suite('Diagnostics Test Suite - Server - GraphQL Validator', () => {
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

    test('Valid over sized record diagnostic', async () => {
        const textDocument = TextDocument.create(
            'file://test.js',
            'javascript',
            1,
            `
            export default class graphqlRecordSizeTest extends LightningElement {

                gqlQuery = gql\`
                    query {
                        uiapia {
                            query {
                                Book__c {
                                    edges {
                                        node {
                                            Chapter4__c { value }
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

        const graphqlValidator = new GraphQLValidator();
        graphqlValidator.addProducer(new OversizedRecord());
        const sections =
            graphqlValidator.gatherDiagnosticSections(textDocument);
        assert.equal(sections.length, 1);
        const diagnostics = await graphqlValidator.validateData(
            {},
            sections[0].document,
            sections[0].data
        );

        assert.equal(diagnostics.length, 2);
        assert.equal(diagnostics[0].data, RULE_ID);
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
        const graphqlValidator = new GraphQLValidator();
        graphqlValidator.addProducer(new OversizedRecord());
        const sections =
            graphqlValidator.gatherDiagnosticSections(textDocument);
        assert.equal(sections.length, 0);
    });
});
