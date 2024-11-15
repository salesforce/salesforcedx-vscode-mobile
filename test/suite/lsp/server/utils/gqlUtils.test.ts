/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { suite, test, beforeEach, afterEach } from 'mocha';
import { readFileSync } from 'fs';

import * as assert from 'assert';
import * as sinon from 'sinon';

import { parse } from 'graphql';
import { ObjectInfoUtils } from '../../../../../src/lsp/server/utils/objectInfoUtils';
import { generateEntityTree, OperationNode, Relation } from '../../../../../src/lsp/server/utils/gqlUtils';

import { ObjectInfoRepresentation } from '../../../../../src/lsp/server/types';
suite('GraphQL Utils Test Suite - Server', () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    test('Entity tree with relationship is generated for ObjectInfo retrieval', async () => {
        const account = JSON.parse(readFileSync('test/suite/lsp/server/testFixture/objectInfos/Account.json', 'utf-8'));
        const user = JSON.parse(readFileSync('test/suite/lsp/server/testFixture/objectInfos/User.json', 'utf-8'));
        const contact = JSON.parse(readFileSync('test/suite/lsp/server/testFixture/objectInfos/Contact.json', 'utf-8'));
        const getObjectInfoStub = sandbox.stub(ObjectInfoUtils, 'getObjectInfo');
        getObjectInfoStub
            .onCall(0)
            .resolves(account as unknown as ObjectInfoRepresentation);
        getObjectInfoStub
            .onCall(1)
            .resolves(user as unknown as ObjectInfoRepresentation);
        getObjectInfoStub
            .onCall(2)
            .resolves(contact as unknown as ObjectInfoRepresentation);

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
        const rootNode = generateEntityTree(astNode);
        const operations: OperationNode[] = rootNode.operations;
        //One operation 'query'
        assert.equal(operations.length, 1);

        const entities = operations[0].entities;
        //One entity 'Account'
        assert.equal(entities.length, 1);

        const accountEntity = entities[0];
        assert.strictEqual(accountEntity.name, 'Account');

        // One property
        const properties = accountEntity.properties;
        assert.equal(properties.length, 1);

        // Property name is 'name'
        const property = properties[0];
        assert.equal(property.property, 'Name');

        // Two relationships
        const relationships = accountEntity.relationships;
        assert.equal(relationships.length, 2);

        // Relation 1 is 'Contacts' child relationship.
        const relationshipOne = relationships[0];
        assert.strictEqual(relationshipOne.name, 'Contacts');
        assert.strictEqual(relationshipOne.relation, Relation.CHILD);

        // Relation 1 has 'Contact' as its entity
        const relationOneEntity = relationshipOne.entity;
        assert.ok(
            !Array.isArray(relationOneEntity),
            'Contacts should be child relationship'
        );
        assert.ok(
            relationOneEntity.name === undefined,
            `Entity name of ${relationshipOne.name} is not retrieved yet`
        );

        // Relation 1 has 1 property 'Name'
        const relationshipOneProperties = relationOneEntity.properties;
        assert.equal(relationshipOneProperties.length, 1);

        assert.strictEqual(relationshipOneProperties[0].property, 'Name');

        // Relation 2 is 'LastModifiedBy' parent relationship.
        const relationshipTwo = relationships[1];
        assert.strictEqual(relationshipTwo.name, 'LastModifiedBy');
        assert.strictEqual(relationshipTwo.relation, Relation.PARENT);

        // Relation 2 has 'User' as its entity
        const relationTwoEntity = relationshipTwo.entity;
        assert.ok(
            !Array.isArray(relationTwoEntity),
            'LastModifiedBy should be parent relationship'
        );
        assert.ok(
            relationTwoEntity.name === undefined,
            `Entity name of ${relationshipTwo.name} is not retrieved yet`
        );

        // Relation 2 has 1 property 'Name'
        const relationshipTwoProperties = relationTwoEntity.properties;
        assert.equal(relationshipTwoProperties.length, 1);

        assert.strictEqual(relationshipTwoProperties[0].property, 'Name');
    });
});
