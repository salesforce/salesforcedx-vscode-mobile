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
import { OrgUtils } from '../../utils/orgUtils';

const LOCAL_CHANGE_NOT_AWARE_MESSAGE = 'uiapi is misspelled.';
const SEVERITY = DiagnosticSeverity.Error;

export const RULE_ID = 'misspelled-uiapi';

/**
 * DUMMY demo implementation showcasing graphql parsing and diagnostic geneation for scaffolding.
 * Produce diagnostic when graphql uiapi node is misspelled.
 */
export class MisspelledUiapi implements DiagnosticProducer<ASTNode> {
    getId(): string {
        return RULE_ID;
    }

    validateDocument(
        textDocument: TextDocument,
        rootNode: ASTNode
    ): Promise<Diagnostic[]> {
        const results: Diagnostic[] = [];

        visit(rootNode, {
            Name: {
                enter(node, key, parent, path, ancestors) {
                    const name = node.value.toLocaleLowerCase();
                    if (name.startsWith('uiapi') && name !== 'uiapi') {
                        results.push({
                            severity: SEVERITY,
                            range: {
                                start: textDocument.positionAt(
                                    node.loc?.start as number
                                ),
                                end: textDocument.positionAt(
                                    node.loc?.end as number
                                )
                            },
                            message: LOCAL_CHANGE_NOT_AWARE_MESSAGE
                        } as Diagnostic);
                    }
                }
            }
        });

        return Promise.resolve(results);
    }
}
