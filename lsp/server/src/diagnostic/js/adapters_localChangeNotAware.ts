/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as parser from '@babel/parser';
import { Node, isCallExpression } from '@babel/types';
import traverse from '@babel/traverse';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticProducer } from '../DiagnosticProducer';
import { Diagnostic, DiagnosticSeverity } from 'vscode';


/** */
class AdaptersLocalChangeNotAware implements DiagnosticProducer<Node> {
    validateDocument(textDocument: TextDocument, node: Node): Promise<Diagnostic[]> {
         return Promise.resolve(this.findNonEditableAdapter(node, 'getRelatedRecordList').map((item) => {
            return  {
                severity: DiagnosticSeverity.Warning,
                range: { 
                    start: textDocument.positionAt(item.start as number), 
                    end: textDocument.positionAt(item.end as number)
                },
                message: "",
            } as Diagnostic;
         }));
    }
    
    findNonEditableAdapter(ast: Node, adapterName: string): Node[] {
        const targetNodes: Node[] = [];
        traverse(ast, {
            Decorator(path) {
                const expression = path.node.expression;
                if (isCallExpression(expression)) {
                    const callee = expression.callee;
                    if (callee.type === 'Identifier' && callee.name === 'wire') {
                        if (
                            expression.arguments[0].type === 'Identifier' &&
                            expression.arguments[0].name === adapterName
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
