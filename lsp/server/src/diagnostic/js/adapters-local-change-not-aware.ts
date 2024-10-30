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

export const LOCAL_CHANGE_NOT_AWARE_MESSAGE =
    'You are using a wire adapter that will work with records while offline, but will not update to add or remove records that are created or deleted while offline. Consider using GraphQL to create a related list with records that are editable offline.';
export const LOCAL_CHANGE_NOT_AWARE_EXTERNAL_DOC_URL =
    'https://developer.salesforce.com/docs/platform/graphql/guide/query-related-list-info.html';
const SEVERITY = DiagnosticSeverity.Information;

const LOCAL_CHANGE_NOT_AWARE_ADAPTERS: string[] = [
    'getRelatedListRecords',
    'getRelatedListCount'
];

export const RULE_ID = 'adapters-local-change-not-aware';

/**
 * Produce diagnostics for adapter which works offline but doesn't handle local change.
 */
export class AdaptersLocalChangeNotAware implements DiagnosticProducer<Node> {
    getId(): string {
        return RULE_ID;
    }

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
                    message: LOCAL_CHANGE_NOT_AWARE_MESSAGE,
                    code: LOCAL_CHANGE_NOT_AWARE_EXTERNAL_DOC_URL,
                    codeDescription: {
                        href: LOCAL_CHANGE_NOT_AWARE_EXTERNAL_DOC_URL
                    }
                } as Diagnostic;
            })
        );
    }

    /**
     * Find a list of adapters which are not draft change aware. For example: getRelatedListRecords from below LWC. 
        export default class RelatedListRecords extends LightningElement {
            ...
            @wire(getRelatedListRecords, 
            ...
        }
     * @param astNode The AST root node for the LWC js file.
     * @param adapterNames Adapter names which are not able to reflect the local change.
     * @returns A list of AST nodes whose names match the adapter names. 
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
