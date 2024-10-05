import { Diagnostic } from 'vscode-languageserver';
import * as parser from '@babel/parser';
import { Node, isCallExpression } from '@babel/types';
import traverse from '@babel/traverse';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { text } from 'stream/consumers';

export async function validateDocument(
    textDocument: TextDocument
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const { uri } = textDocument;

    const jsNode = parser.parse(textDocument.getText(), {
        sourceType: 'module',
        plugins: ['decorators']
    });
    findNonEditableAdapter(jsNode, 'getRelatedRecordList');

    return diagnostics;
}

export function findNonEditableAdapter(ast: Node, adapterName: string): Node[] {
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
