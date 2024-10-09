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
    'You are using a wire adapter that works while offline, but doesn’t update to add or remove records that are created or deleted while offline';
const SEVERITY = DiagnosticSeverity.Information;

const LOCAL_CHANGE_NOT_AWARE_ADAPTERS: string[] = ['getRelatedListRecords', 'getRelatedListCount'];

/** 
 * Produce diagnostic for adapter which works offline but doesn't handle local change. 
*/
export class AdaptersLocalChangeNotAware implements DiagnosticProducer<Node> {
   
    validateDocument(
        textDocument: TextDocument,
        node: Node
    ): Promise<Diagnostic[]> {
         return Promise.resolve(
            this.findNonEditableAdapter(node, LOCAL_CHANGE_NOT_AWARE_ADAPTERS).map((item) => {
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
     * @param ast 
     * @param adapterNames 
     * @returns 
     */
    private findNonEditableAdapter(ast: Node, adapterNames: string[]): Node[] {
        const targetNodes: Node[] = [];
        traverse(ast, {
            Decorator(path) {
                const expression = path.node.expression;
                if (isCallExpression(expression)) {
                    const callee = expression.callee;
                    if (
                        callee.type === 'Identifier' &&
                        callee.name === 'wire'
                    ) {
                        if (
                            expression.arguments[0].type === 'Identifier' &&
                            adapterNames.includes(expression.arguments[0].name)
                        ) {
                            targetNodes.push(expression.arguments[0]);
                        }
                    }
                }
            }
        });
        return targetNodes;
    }
}
