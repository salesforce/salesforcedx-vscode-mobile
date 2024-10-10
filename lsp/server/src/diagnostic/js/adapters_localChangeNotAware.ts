/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Node, isCallExpression } from '@babel/types';
import traverse from '@babel/traverse';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticProducer } from '../DiagnosticProducer';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

const LOCAL_CHANGE_NOT_AWARE_MESSAGE =
    'The wire adapter you are using allows you to work offline, but it does not automatically update its records when data is added or removed while you are disconnected.';
const SEVERITY = DiagnosticSeverity.Information;

const LOCAL_CHANGE_NOT_AWARE_ADAPTERS: string[] = [
    'getRelatedListRecords',
    'getRelatedListCount'
];

/**
 * Produce diagnostics for adapter which works offline but doesn't handle local change.
 */
export class AdaptersLocalChangeNotAware implements DiagnosticProducer<Node> {
    validateDocument(
        textDocument: TextDocument,
        node: Node
    ): Promise<Diagnostic[]> {
        return Promise.resolve(
            this.findLocalChangeNotAwareAdapterNode(
                node,
                LOCAL_CHANGE_NOT_AWARE_ADAPTERS
            ).map((item) => {
                return {
                    severity: SEVERITY,
                    range: {
                        start: textDocument.positionAt(item.start as number),
                        end: textDocument.positionAt(item.end as number)
                    },
                    message: LOCAL_CHANGE_NOT_AWARE_MESSAGE
                } as Diagnostic;
            })
        );
    }

    /**
     * Find @wire adapter call which called in the local change not aware adapters. For example: 
        export default class RelatedListRecords extends LightningElement {
            ...
            @wire(getRelatedListRecords, 
            ...
        }
     * @param astNode root node to search
     * @param adapterNames adapter which are not able to reflect the local change.
     * @returns nodes with adapter name
     */
    private findLocalChangeNotAwareAdapterNode(
        astNode: Node,
        adapterNames: string[]
    ): Node[] {
        const targetNodes: Node[] = [];
        traverse(astNode, {
            Decorator(path) {
                const expression = path.node.expression;
                if (isCallExpression(expression)) {
                    const callee = expression.callee;
                    if (
                        callee.type === 'Identifier' &&
                        callee.name === 'wire' &&
                        expression.arguments[0].type === 'Identifier' &&
                        adapterNames.includes(expression.arguments[0].name)
                    ) {
                        targetNodes.push(expression.arguments[0]);
                    }
                }
            }
        });
        return targetNodes;
    }
}
