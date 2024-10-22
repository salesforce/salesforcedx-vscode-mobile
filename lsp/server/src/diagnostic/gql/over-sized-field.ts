/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticProducer } from '../DiagnosticProducer';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { ASTNode, visit } from 'graphql';

export class OversizedField implements DiagnosticProducer<ASTNode> {
    async validateDocument(
        textDocument: TextDocument,
        rootNode: ASTNode
    ): Promise<Diagnostic[]> {
        const results: Diagnostic[] = [];

        visit(rootNode, {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Field: {
                enter(node, key, parent, path, ancestors) {
                    if (node.name.value !== 'node' || !node.selectionSet) {
                        return;
                    }
                }
            }
        });

        return results;
    }
}
