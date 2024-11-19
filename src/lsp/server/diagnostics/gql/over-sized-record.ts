/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticProducer } from '../DiagnosticProducer';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import type { ASTNode, FieldNode } from 'graphql';

import {
    generateEntityTree,
    resolveEntityNameFromMetadata,
    getFieldSize
} from '../../utils/gqlUtils';
import { OrgUtils } from '../../utils/orgUtils';
import type { RootNode, EntityNode } from '../../utils/gqlUtils';

const MAX_ALLOWED_SIZE = 32768;

export const OVER_SIZED_FIELD_MESSAGE =
    'This field’s value could exceed 32 KB. Large data sizes can negatively affect mobile app performance, and potentially result in fewer returned records than expected.';
export const OVER_SIZED_RECORD_MESSAGE =
    'The total data size of all record fields could exceed 32 KB. Large data sizes can negatively affect mobile app performance, and potentially result in fewer returned records than expected.';

const SEVERITY = DiagnosticSeverity.Information;

export const RULE_ID = 'over-sized-record';
export class OversizedRecord implements DiagnosticProducer<ASTNode> {
    async validateDocument(
        textDocument: TextDocument,
        rootNode: ASTNode
    ): Promise<Diagnostic[]> {
        const rootDiagnosticNode = generateEntityTree(rootNode);
        const rawDiagNodes = await createDiagnostics(rootDiagnosticNode);

        const { overSizedEntities, overSizedFields } = rawDiagNodes;

        return [
            ...overSizedFields.map((rawNode) => {
                return createLspDiagnostic(
                    textDocument,
                    rawNode,
                    OVER_SIZED_FIELD_MESSAGE
                );
            }),
            ...overSizedEntities.map((rawNode) => {
                return createLspDiagnostic(
                    textDocument,
                    rawNode,
                    OVER_SIZED_RECORD_MESSAGE
                );
            })
        ];
    }

    getId(): string {
        return RULE_ID;
    }
}

export interface OverSizedDiagnostics {
    overSizedFields: Array<FieldNode>;
    overSizedEntities: Array<FieldNode>;
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
            try {
                await generateDiagnostic(entityNode, results);
            } catch (e) {
                console.log(
                    `Cannot conduct over-sized record diagnostic for ${entityNode.name}: ${(e as Error).message} `
                );
            }
        }
    }
    return results;
}

/**
 * Recursively search within an EntityNode for FieldNodes containing oversized records.
 * @param entityNode The EntityNode to search within
 * @param overSizedFields Array to which oversized FieldNodes are added.
 * @returns A promise that resolves when diagnostics generation is complete.
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

        let totalSize = 0;
        for (const propertyNode of entityNode.properties) {
            const fieldSize = getFieldSize(objectInfo, propertyNode.property);

            propertyNode.size = fieldSize;

            if (fieldSize !== undefined) {
                totalSize += fieldSize;

                // Oversized field check
                if (fieldSize > MAX_ALLOWED_SIZE) {
                    overSizedDiagnostic.overSizedFields.push(propertyNode.node);
                }
            }
        }
        entityNode.size = totalSize;
        if (totalSize > MAX_ALLOWED_SIZE) {
            overSizedDiagnostic.overSizedEntities.push(entityNode.node);
        }

        for (const relation of entityNode.relationships) {
            if (Array.isArray(relation.entity)) {
                continue;
            }
            // Find entity name. Polymorphic parent relationship is not supported for now.
            if (relation.entity.name === undefined) {
                const entityName = resolveEntityNameFromMetadata(
                    objectInfo,
                    relation
                );
                if (entityName === undefined) {
                    continue;
                }
                relation.entity.name = entityName;
            }

            try {
                await generateDiagnostic(relation.entity, overSizedDiagnostic);
            } catch (e) {
                console.log(
                    `Cannot conduct over-sized record diagnostic for ${entityNode.name}: ${(e as Error).message}`
                );
            }
        }
    }
}

function createLspDiagnostic(
    textDocument: TextDocument,
    fieldNode: FieldNode,
    message: string
): Diagnostic {
    const nameNode = fieldNode.name;
    return {
        severity: SEVERITY,
        range: {
            start: textDocument.positionAt(nameNode.loc?.start as number),
            end: textDocument.positionAt(nameNode.loc?.end as number)
        },
        message
    };
}
