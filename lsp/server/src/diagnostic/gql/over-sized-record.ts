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
    generateDiagnosticTree,
    createDiagnostics
} from '../../utils/gqlUtils';

const OVER_SIZED_FIELD_MESSAGE =
    'This field’s value could exceed 32 KB. Large data sizes can negatively affect mobile app performance, potentially resulting in fewer records being returned.';
const OVER_SIZED_RECORD_MESSAGE =
    'The total data size of all record fields could exceed 32 KB. Large data sizes can negatively affect mobile app performance, potentially resulting in fewer records being returned.';

const SEVERITY = DiagnosticSeverity.Information;

export const RULE_ID = 'over-sized-record';
export class OversizedRecord implements DiagnosticProducer<ASTNode> {
    async validateDocument(
        textDocument: TextDocument,
        rootNode: ASTNode
    ): Promise<Diagnostic[]> {
        const rootDiagnosticNode = generateDiagnosticTree(rootNode);
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
