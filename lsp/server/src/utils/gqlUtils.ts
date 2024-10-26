/* eslint-disable @typescript-eslint/naming-convention */
/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import type { ASTNode, FieldNode, OperationDefinitionNode } from 'graphql';

import { visit, Kind } from 'graphql';
import { ObjectInfoRepresentation } from '../types';

/**
 * Represent an entity in graphql query.
 */
export interface EntityNode {
    // Graphql AST node
    node: FieldNode;
    // Entity name, like `Account`
    name: string | undefined;
    // Total size of immediate children fields
    size: number | undefined;
    // Related entities, which might be child, parent or polymorphic-parent
    relationships: Array<RelatedEntity>;
    // Property fields
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
    //Use a single instance for parent/child relationships; use an array for polymorphic parent relationships
    entity: EntityNode | Array<EntityNode>;
}

// Represents an object property field node in GraphQL query
interface PropertyNode {
    // Graphql AST node
    node: FieldNode;
    // Field name
    property: string;
    // Max size of the field.
    size: number | undefined;
}

/**
 * Represent an OperationDefintionNode in GraphQL query. It is at the second level of entity tree.
 */
interface OperationNode {
    node: OperationDefinitionNode;
    // 'Query' in most cases
    name: string;
    entities: Array<EntityNode>;
}

// Root node of entity tree
export interface RootNode {
    node: FieldNode;
    operations: Array<OperationNode>;
}

// Nodes from graphql which doesn't carry information about entity or fields.
const structureNodeNames = ['uiapi', 'query', 'edges', 'node'];

// Node types supported in entity tree
export type DiagnosticNode =
    | EntityNode
    | OperationNode
    | RootNode
    | PropertyNode;

/**
 * Traverse the GraphQL ASTNode to build an entity tree, using EntityNode as intermediate nodes and PropertyNode as leaf nodes.
 * Since the GraphQL visitor does not support asynchronous calls, this data structure is essential for async ObjectInfo retrieval.
 *
 * @param rootASTNode Root GraphQL ASTNode
 * @returns RootNode of an entity tree
 */
export function generateEntityTree(rootASTNode: ASTNode): RootNode {
    const rootNode: RootNode = {
        node: {
            kind: Kind.FIELD,
            name: { kind: Kind.NAME, value: 'root' }
        } as FieldNode,
        operations: []
    };
    // Maintain traversal path
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
                    // OperationNode is at the second level
                    topElement.operations.push(operationNode);
                    stack.push(operationNode);
                }
            },

            leave(node, key, parent, path, ancesters) {
                const topElement = stack[stack.length - 1];

                // Pop up current node if it is at the top of the stack
                if (topElement.node === node) {
                    stack.pop();
                }
            }
        },

        Field: {
            enter(node, key, parent, path, ancestors) {
                if (
                    // Structure nodes like 'uiapi', 'query', 'edges', 'node' are ignored
                    !isContentNode(node) ||
                    // Leave node is ignored. For example, 'value' node within {```LastModifiedById { value }} ``` }.
                    node.selectionSet === undefined ||
                    !Array.isArray(ancestors)
                ) {
                    return;
                }
                const immediateAncestorIndex = findCloseAncestorWithType(
                    ancestors,
                    Kind.FIELD
                );

                // Return if no ancestor FieldNode
                if (immediateAncestorIndex === -1) {
                    return;
                }
                const immediateAncestor = ancestors[immediateAncestorIndex];
                // Top level entity has `query` as its parent
                if (immediateAncestor.name.value === 'query') {
                    const entity: EntityNode = {
                        node,
                        name: node.name.value,
                        size: undefined,
                        relationships: [],
                        properties: []
                    };
                    const topElement = stack[stack.length - 1];
                    //Parent in EntityTree is OperationNode
                    if (isOperationNode(topElement)) {
                        topElement.entities.push(entity);
                        stack.push(entity);
                    }
                } else if (immediateAncestor.name.value === 'node') {
                    //Add this node as PropertyNode and update its parent node in EntityTree as ChildRelation Entity
                    let parentEntity = undefined;
                    try {
                        parentEntity = resolveEntityNodeForProperty(ancestors);
                    } catch (e) {}
                    if (parentEntity === undefined) {
                        return;
                    }

                    addPropertyWithRelation(node, parentEntity, stack, false);
                } else {
                    //Add this node as PropertyNode and update its parent node in EntityTree as ParentRelation Entity
                    addPropertyWithRelation(
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

/**
 * Add a node as a PropertyNode and evaluate its parent in the entity tree. If the parent node is a PropertyNode,
 * convert it to an EntityNode and replace it within its grandparent node as a relationship node.  As traversal progresses,
 * the added PropertyNode may be converted into an EntityNode.
 * @param node - The property node to add.
 * @param parentNode - The parent node in the entity tree.
 * @param stack - Stack used during traversal.
 * @param parentRelationship - Set to true if the parent node represents a relationship.
 * @returns
 */
function addPropertyWithRelation(
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

    // Convert its parent to EntityNode if its parent is PropertyNode.
    if (isPropertyNode(topElement)) {
        const parent = stack.pop() as PropertyNode;
        const parentEntity: EntityNode = {
            node: parent.node,
            // Name is not defined since ObjectInfo is not availabe yet.
            name: undefined,
            size: -1,
            relationships: [],
            properties: []
        };

        const relatedEntity: RelatedEntity = {
            relation: parentRelationship ? Relation.PARENT : Relation.CHILD,
            // Relationship name
            name: parent.node.name.value,
            entity: parentEntity
        };
        const grandParent = stack[stack.length - 1] as EntityNode;
        //Replace parent as a relation in grand parent in EntityTree
        grandParent.properties.pop();
        grandParent.relationships.push(relatedEntity);
        //Add parent back to stack
        stack.push(parentEntity);
    }

    // Add PropertyNode to parent entity
    topElement = stack[stack.length - 1] as EntityNode;
    topElement.properties.push(propertyNode);
    //Update stack
    stack.push(propertyNode);
}

/**
 * Determine field size based on object meta data
 * @param objectinfo object meta data
 * @param fieldName field name
 * @returns field size
 */
export function getFieldSize(
    objectinfo: ObjectInfoRepresentation,
    fieldName: string
): number | undefined {
    const fieldInfo = objectinfo.fields[fieldName];

    return fieldInfo === undefined ? undefined : fieldInfo.length;
}

/**
 * Determine the entity name of a related entity based on object metadata.
 * @param objectInfo - Metadata information of the object.
 * @param relatedEntity - The related entity whose name is to be identified.
 * @returns The entity name for the related entity, if found.
 */
export function resolveEntityNameFromMetadata(
    objectInfo: ObjectInfoRepresentation,
    relatedEntity: RelatedEntity
): string | undefined {
    // Hanle child relationship
    if (relatedEntity.relation === Relation.CHILD) {
        const childRelationships = objectInfo.childRelationships;
        const targetChildRelation = childRelationships.find((childRelation) => {
            return childRelation.relationshipName === relatedEntity.name;
        });
        if (targetChildRelation) {
            return targetChildRelation.childObjectApiName;
        }
    } else if (relatedEntity.relation === Relation.PARENT) {
        //Handle parent relationship
        const fields = objectInfo.fields;
        for (const key in fields) {
            const fieldInfo = fields[key];
            if (
                fieldInfo.relationshipName === relatedEntity.name &&
                !fieldInfo.polymorphicForeignKey &&
                fieldInfo.referenceToInfos &&
                fieldInfo.referenceToInfos.length > 0
            ) {
                return fieldInfo.referenceToInfos[0].apiName;
            }
        }
    }
    return undefined;
}

// Return true if the specified node is a RootNode.
function isRootNode(node: DiagnosticNode): node is RootNode {
    return 'operations' in node;
}

// Return true if the specified node is an OperationNode.
function isOperationNode(node: DiagnosticNode): node is OperationNode {
    return 'entities' in node;
}

// Return true if the specified node is an EntityNode.
function isEntityNode(node: DiagnosticNode): node is EntityNode {
    return 'properties' in node;
}

// Return true if the specified node is a PropertyNode.
function isPropertyNode(node: DiagnosticNode): node is PropertyNode {
    return 'property' in node;
}

/**
 * Identify the EntityNode for a given Property. This Property node is a child under 'edges' or 'node' ASTNode.
 * @param propertyNodeAncestors - Ancestors of the property node.
 * @returns The corresponding EntityNode.
 */
export function resolveEntityNodeForProperty(
    propertyNodeAncestors: ReadonlyArray<ASTNode>
): FieldNode {
    const parentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeAncestors,
        Kind.FIELD
    );
    if (
        parentFieldAncestorIndex === -1 ||
        (propertyNodeAncestors[parentFieldAncestorIndex] as FieldNode).name
            .value !== 'node'
    ) {
        throw new Error('No correct parent node exists');
    }

    const grandParentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeAncestors,
        Kind.FIELD,
        parentFieldAncestorIndex - 1
    );

    if (
        grandParentFieldAncestorIndex === -1 ||
        (propertyNodeAncestors[grandParentFieldAncestorIndex] as FieldNode).name
            .value !== 'edges'
    ) {
        throw new Error('No edges node exists');
    }

    const grandgrandParentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeAncestors,
        Kind.FIELD,
        grandParentFieldAncestorIndex - 1
    );

    if (grandgrandParentFieldAncestorIndex === -1) {
        throw new Error('No entity node exists');
    }

    return propertyNodeAncestors[
        grandgrandParentFieldAncestorIndex
    ] as FieldNode;
}

/**
 * Determine if a FieldNode is property or entity.
 * @param node  a common FieldNode
 * @returns true if specified node is a property or entity
 */
function isContentNode(node: FieldNode): boolean {
    return !structureNodeNames.includes(node.name.value);
}

// Returns true if the specified node is a FieldNode.
export function isFieldNode(node: ASTNode): node is FieldNode {
    return node !== undefined && node.kind !== undefined
        ? node.kind === 'Field'
        : false;
}

/**
 * Locate the nearest ancestor node of a specified ASTNode type.
 * @param ancestors - The ancestors of an ASTNode.
 * @param type - The target ASTNode type to search for.
 * @param endIndex - Starting index for the search, moving from higher to lower indices.
 * @returns The index of the nearest matching ancestor.
 */
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
