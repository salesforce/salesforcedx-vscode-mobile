/* eslint-disable @typescript-eslint/naming-convention */
/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import type { ASTNode, FieldNode, OperationDefinitionNode } from 'graphql';

import { visit, Kind } from 'graphql';
import { OrgUtils } from './orgUtils';
import { FieldRepresentation, ObjectInfoRepresentation } from '../types';

const MAX_ALLOWED_SIZE = 200;

/**
 * Represents an entity node from graphql with total size, and child field grapql ql node.  
 */
export interface EntityNode {
    // The graphql ast node
    node: FieldNode;
    // Entity name, like Account
    name: string | undefined;
    // total size of fetched immediate children fields
    size: number | undefined;
    // Related 
    relationships: Array<RelatedEntity>;
    properties: Array<PropertyNode>;
}

enum Relation {
    PARENT,
    CHILD,
    POLYMORPHIC_PARENT
}
export interface RelatedEntity {
    relation: Relation;
    name: string;
    //Array for polymorphic parentship
    entity: EntityNode | Array<EntityNode>;
}

// Represents an graphql field node with its pulled from objectInfo. 
interface PropertyNode {
    // The field graphql ast node 
    node: FieldNode;
    // The field name
    property: string;
    // the max size of the field. 
    size: number | undefined;
    fieldDefinition?: FieldRepresentation | undefined;
}

interface OperationNode {
    node: OperationDefinitionNode;
    name: string;
    entities: Array<EntityNode>;
}

export interface RootNode {
    node: FieldNode;
    operations: Array<OperationNode>;
}

// Nodes from graphql which doesn't carry information about entity or fields. 
const structureNodeNames = ['uiapi', 'query', 'edges', 'node'];

export type DiagnosticNode =
    | EntityNode
    | OperationNode
    | RootNode
    | PropertyNode;

export function generateDiagnosticTree(rootASTNode: ASTNode): RootNode {
    const rootNode: RootNode = {
        node: {
            kind: Kind.FIELD,
            name: { kind: Kind.NAME, value: 'root' }
        } as FieldNode,
        operations: []
    };
    const stack: DiagnosticNode[] = [];
    stack.push(rootNode);

    visit(rootASTNode, {
        OperationDefinition: {
            enter(node, key, parent, path, ancesters) {
                const topElement = stack[stack.length - 1];
                if (isRootNode(topElement)) {
                    const operationNode = {
                        node,
                        name: node.name ? node.name.value : '',
                        entities: []
                    } satisfies OperationNode;
                    topElement.operations.push(operationNode);
                    stack.push(operationNode);
                }
            },

            leave(node, key, parent, path, ancesters) {
                const topElement = stack[stack.length - 1];

                // Pop up if current node is at the top of the stack
                if (topElement.node === node) {
                    stack.pop();
                }
            }
        },

        Field: {
            enter(node, key, parent, path, ancestors) {
                if (
                    !isContentNode(node) ||
                    //This is leave like value within {```LastModifiedById { value }} ``` }
                    node.selectionSet === undefined ||
                    !Array.isArray(ancestors)
                ) {
                    return;
                }
                const immediateAncestorIndex = findCloseAncestorWithType(
                    ancestors,
                    Kind.FIELD
                );
                if (immediateAncestorIndex === -1) {
                    return;
                }
                const immediateAncestor = ancestors[immediateAncestorIndex];
                // Root level entity
                if (immediateAncestor.name.value === 'query') {
                    const entity: EntityNode = {
                        node,
                        name: node.name.value,
                        size: undefined,
                        relationships: [],
                        properties: []
                    };
                    const topElement = stack[stack.length - 1];
                    if (isOperationNode(topElement)) {
                        topElement.entities.push(entity);
                        stack.push(entity);
                    }
                    // add to tree
                } else if (immediateAncestor.name.value === 'node') {
                    // child relationship
                    let parentEntity = undefined;
                    try {
                        parentEntity = findEntityNodeForProperty(ancestors);
                    } catch (e) {}
                    if (parentEntity === undefined) {
                        return;
                    }
                    handlePropertyWithRelation(
                        node,
                        parentEntity,
                        stack,
                        false
                    );
                } else {
                    // parent relationship
                    handlePropertyWithRelation(
                        node,
                        immediateAncestor,
                        stack,
                        true
                    );
                }
            },
            leave(node, key, parent, path, ancestors) {
                if (
                    !isContentNode(node) ||
                    node.selectionSet === undefined ||
                    !Array.isArray(ancestors)
                ) {
                    return;
                }
                const topElement = stack[stack.length - 1];

                // Pop up if current node is at the top of the stack
                if (topElement.node === node) {
                    stack.pop();
                }
            }
        }
    });
    return stack.pop() as RootNode;
}

// The property can be normal property or child relationship. 
// It is unkwown at the beginning, but can be evaluated when it is child property is added
function handlePropertyWithRelation(
    node: FieldNode,
    parentNode: FieldNode,
    stack: DiagnosticNode[],
    parentRelationship: boolean
) {
    let topElement = stack[stack.length - 1];
    if (
        isRootNode(topElement) ||
        isOperationNode(topElement) ||
        topElement.node !== parentNode
    ) {
        return;
    }

    const propertyNode: PropertyNode = {
        node,
        property: node.name.value,
        size: -1
    };

    // Update its parent type to Entity
    if (isPropertyNode(topElement)) {
        const parent = stack.pop() as PropertyNode;
        const parentEntity: EntityNode = {
            node: parent.node,
            // name be retrieved later based off relationship
            name: undefined,
            size: -1,
            relationships: [],
            properties: []
        };
        //Parent is a child relationship to its grandparent
        const relatedEntity: RelatedEntity = {
            relation: parentRelationship ? Relation.PARENT : Relation.CHILD,
            // relationship name
            name: parent.node.name.value,
            entity: parentEntity
        };
        const grandParent = stack[stack.length - 1] as EntityNode;
        //Removes parent from the Diagnostic Tree
        grandParent.properties.pop();
        grandParent.relationships.push(relatedEntity);
        stack.push(parentEntity);
    }

    // Adds property to parent entity
    topElement = stack[stack.length - 1] as EntityNode;
    topElement.properties.push(propertyNode);
    stack.push(propertyNode);
    // const entityNode: EntityNode = {
    //     node,
    //     name: undefined,
    //     size: -1
    // };
}

export interface OverSizedDiagnostics {
    overSizedFields: Array<FieldNode>,
    overSizedEntities: Array<FieldNode>
}

export async function createDiagnostics(
    rootNode: RootNode
): Promise<OverSizedDiagnostics> {
    const results: OverSizedDiagnostics = {
        overSizedFields: [],
        overSizedEntities: []
    };

    for (const operationNode of rootNode.operations) {
        for (const entityNode of operationNode.entities) {
            await generateDiagnostic(entityNode, results);
        }
    }
    return results;
}

function getFieldSize(
    objectinfo: ObjectInfoRepresentation,
    fieldName: string
): number | undefined {
    const fieldInfo = objectinfo.fields[fieldName];

    return fieldInfo === undefined ? undefined : fieldInfo.length;
}
/**
 * Recursively research for FieldNode with large records.
 * @param entityNode
 * @param overSizedFields
 * @returns
 */
async function generateDiagnostic(
    entityNode: EntityNode,
    overSizedDiagnostic: OverSizedDiagnostics
) {
    if (entityNode.name) {
        const objectInfo = await OrgUtils.getObjectInfo(entityNode.name);
        if (objectInfo === undefined) {
            return;
        }
        const fieldInfos = objectInfo.fields;
        let totalSize = 0;
        for (const propertyNode of entityNode.properties) {
            const fieldSize = getFieldSize(objectInfo, propertyNode.property);

            propertyNode.size = fieldSize;

            if (fieldSize !== undefined) {
                totalSize += fieldSize;

                // do oversized field check
                if (fieldSize > MAX_ALLOWED_SIZE) {
                    overSizedDiagnostic.overSizedFields.push(propertyNode.node);
                }
            } 
        }
        entityNode.size = totalSize;
        if (totalSize > MAX_ALLOWED_SIZE) {
            overSizedDiagnostic.overSizedEntities.push(entityNode.node)
        }

        for (const relation of entityNode.relationships) {
            if (Array.isArray(relation.entity)) {
                continue;
            }
            // Finds entity name. Polymorphic parent relationship will be supported in future.
            if (relation.entity.name === undefined) {
                const entityName = findEntityName(objectInfo, relation);
                if (entityName === undefined) {
                    continue;
                }
                relation.entity.name = entityName;
            }

            await generateDiagnostic(relation.entity, overSizedDiagnostic);
        }
    }
}

function findEntityName(
    objectInfo: ObjectInfoRepresentation,
    relationship: RelatedEntity
): string | undefined {
    if (relationship.relation === Relation.CHILD) {
        const childRelationships = objectInfo.childRelationships;
        const targetChildRelation = childRelationships.find((childRelation) => {
            return childRelation.relationshipName === relationship.name;
        });
        if (targetChildRelation) {
            return targetChildRelation.childObjectApiName;
        }
    } else if (relationship.relation === Relation.PARENT) {
        const fields = objectInfo.fields;
        for (const key in fields) {
            const fieldInfo = fields[key];
            //Handle parent relationship
            if (
                fieldInfo.relationshipName === relationship.name &&
                !fieldInfo.polymorphicForeignKey &&
                fieldInfo.referenceToInfos &&
                Array.isArray(fieldInfo.referenceToInfos)
            ) {
                return fieldInfo.referenceToInfos[0].apiName;
            }
        }
    }
    return undefined;
}

function isRootNode(node: DiagnosticNode): node is RootNode {
    return 'operations' in node;
}

function isOperationNode(node: DiagnosticNode): node is OperationNode {
    return 'entities' in node;
}

function isEntityNode(node: DiagnosticNode): node is EntityNode {
    return 'properties' in node;
}

function isPropertyNode(node: DiagnosticNode): node is PropertyNode {
    return 'property' in node;
}

// This is from 'node' ancestors
// export function findEntityNodeForNode(
//     propertyNodeancestors: ReadonlyArray<ASTNode>
// ): FieldNode {
//     const parentFieldAncestorIndex = findCloseAncestorWithType(
//         propertyNodeancestors,
//         Kind.FIELD
//     );
//     if (
//         parentFieldAncestorIndex === -1 ||
//         (propertyNodeancestors[parentFieldAncestorIndex] as FieldNode).name
//             .value !== 'edges'
//     ) {
//         throw new Error('No edges node exists');
//     }

//     const grandParentFieldAncestorIndex = findCloseAncestorWithType(
//         propertyNodeancestors,
//         Kind.FIELD,
//         parentFieldAncestorIndex - 1
//     );

//     if (grandParentFieldAncestorIndex === -1) {
//         throw new Error('No entity node exists');
//     }

//     return propertyNodeancestors[grandParentFieldAncestorIndex] as FieldNode;
// }
export function findEntityNodeForProperty(
    propertyNodeancestors: ReadonlyArray<ASTNode>
): FieldNode {
    const parentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeancestors,
        Kind.FIELD
    );
    if (
        parentFieldAncestorIndex === -1 ||
        (propertyNodeancestors[parentFieldAncestorIndex] as FieldNode).name
            .value !== 'node'
    ) {
        throw new Error('No parent node exists');
    }

    const grandParentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeancestors,
        Kind.FIELD,
        parentFieldAncestorIndex - 1
    );

    if (
        grandParentFieldAncestorIndex === -1 ||
        (propertyNodeancestors[grandParentFieldAncestorIndex] as FieldNode).name
            .value !== 'edges'
    ) {
        throw new Error('No edges node exists');
    }

    const grandgrandParentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeancestors,
        Kind.FIELD,
        grandParentFieldAncestorIndex - 1
    );

    if (grandgrandParentFieldAncestorIndex === -1) {
        throw new Error('No entity node exists');
    }

    return propertyNodeancestors[
        grandgrandParentFieldAncestorIndex
    ] as FieldNode;
}

function isContentNode(node: FieldNode): boolean {
    return !structureNodeNames.includes(node.name.value);
}

function findEntityProperties(entityNode: FieldNode): Array<FieldNode> {
    const fields = [];
    if (entityNode.selectionSet !== undefined) {
        for (const field of entityNode.selectionSet.selections) {
            if (isFieldNode(field)) {
                fields.push(field);
            }
        }
    }
    return fields;
}

export function isFieldNode(node: ASTNode): node is FieldNode {
    return node !== undefined && node.kind !== undefined
        ? node.kind === 'Field'
        : false;
}

function findCloseAncestorWithType(
    ancesters: ReadonlyArray<ASTNode>,
    type: Kind,
    endIndex?: number
): number {
    const eIndex = endIndex === undefined ? ancesters.length - 1 : endIndex;
    for (let i = eIndex; i >= 0; i--) {
        if (ancesters[i].kind === type) {
            return i;
        }
    }
    return -1;
}
