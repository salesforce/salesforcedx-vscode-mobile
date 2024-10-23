/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticProducer } from '../DiagnosticProducer';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import type { ASTNode } from 'graphql';
import { visit } from 'graphql';
import {
    generateDiagnosticTree,
    createDiagnostics
} from '../../utils/gqlUtils';

const OVER_SIZED_FIELD_MESSAGE =
    'The fetched field max size could be more than 32,768 bytes.';
const SEVERITY = DiagnosticSeverity.Information;

export const RULE_ID = 'over-sized-field';
export class OversizedField implements DiagnosticProducer<ASTNode> {
    async validateDocument(
        textDocument: TextDocument,
        rootNode: ASTNode
    ): Promise<Diagnostic[]> {
        const rootDiagnosticNode = generateDiagnosticTree(rootNode);
        const rawDiagNodes = await createDiagnostics(rootDiagnosticNode);
        return rawDiagNodes.map((rawNode) => {
            const nameNode = rawNode.name;
            return {
                severity: SEVERITY,
                range: {
                    start: textDocument.positionAt(
                        nameNode.loc?.start as number
                    ),
                    end: textDocument.positionAt(nameNode.loc?.end as number)
                },
                message: OVER_SIZED_FIELD_MESSAGE
            };
        });
    }

    getId(): string {
        return RULE_ID;
    }
}
