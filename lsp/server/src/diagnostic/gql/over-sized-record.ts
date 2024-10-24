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
    'This field’s value could exceed 32 KB. Large data sizes can have a negative performance impact on mobile apps.';
const OVER_SIZED_RECORD_MESSAGE =
    'The total field size of this record could exceed 32 KB. Large data sizes can have a negative performance impact on mobile apps.';

const SEVERITY = DiagnosticSeverity.Information;

export const RULE_ID = 'over-sized-field';
export class OversizedRecord implements DiagnosticProducer<ASTNode> {
    async validateDocument(
        textDocument: TextDocument,
        rootNode: ASTNode
    ): Promise<Diagnostic[]> {
        const rootDiagnosticNode = generateDiagnosticTree(rootNode);
        const rawDiagNodes = await createDiagnostics(rootDiagnosticNode);

        const { overSizedEntities, overSizedFields } = rawDiagNodes;

        const result: Diagnostic[] = [];

        result.concat(
            overSizedFields.map((rawNode) => {
                return createLspDiagnostic(
                    textDocument,
                    rawNode,
                    OVER_SIZED_FIELD_MESSAGE
                );
            })
        );

        result.concat(
            overSizedEntities.map((rawNode) => {
                return createLspDiagnostic(
                    textDocument,
                    rawNode,
                    OVER_SIZED_RECORD_MESSAGE
                );
            })
        );

        return result;
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
