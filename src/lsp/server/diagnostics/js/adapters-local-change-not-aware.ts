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

export const MESSAGE_FOR_GET_RELATED_LIST_RECORDS =
    'You are using a wire adapter that will work with records while offline, but will not update to add or remove records that are created or deleted while offline. Consider using GraphQL to create a related list with records that are editable offline.';
export const URL_FOR_GET_RELATED_LIST_RECORDS_EXTERNAL_DOC =
    'https://developer.salesforce.com/docs/platform/graphql/guide/filter-parent.html#parent-to-child-relationships';

export const MESSAGE_FOR_GET_RELATED_LIST_COUNT =
    'You are using a wire adapter that will work with records while offline, but will not update to add or remove records that are created or deleted while offline.';

const SEVERITY = DiagnosticSeverity.Information;

interface Info {
    message: string;
    link?: string;
}

const LOCAL_CHANGE_NOT_AWARE_ADAPTERS = new Map<string, Info>([
    [
        'getRelatedListRecords',
        {
            message: MESSAGE_FOR_GET_RELATED_LIST_RECORDS,
            link: URL_FOR_GET_RELATED_LIST_RECORDS_EXTERNAL_DOC
        }
    ],
    ['getRelatedListCount', { message: MESSAGE_FOR_GET_RELATED_LIST_COUNT }]
]);

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
        const result: Diagnostic[] = [];

        const nodeInfoMap = this.findLocalChangeNotAwareAdapterNode(node);

        for (let [node, info] of nodeInfoMap) {
            const diagnostic: Diagnostic = {
                severity: SEVERITY,
                range: {
                    start: textDocument.positionAt(node.start as number),
                    end: textDocument.positionAt(node.end as number)
                },
                message: info.message
            };
            if (info.link !== undefined) {
                diagnostic.code = info.link;
                diagnostic.codeDescription = {
                    href: info.link
                };
            }
            result.push(diagnostic);
        }

        return Promise.resolve(result);
    }

    /**
     * Find a map of astNode to corresponding diagnostic info for adapters which are not draft change aware. 
     * For example: getRelatedListRecords from below LWC. 
        export default class RelatedListRecords extends LightningElement {
            ...
            @wire(getRelatedListRecords, 
            ...
        }
     * @param astNode The AST root node for the LWC js file.
     * @returns A map where each key is an ASTNode representing an adapter that does not account for specific local changes,
     * and each value is an Info object containing a message and, optionally, a link with additional context.
     */
    private findLocalChangeNotAwareAdapterNode(astNode: Node): Map<Node, Info> {
        const result = new Map<Node, Info>();
        traverse(astNode, {
            Decorator(path) {
                const expression = path.node.expression;
                if (isCallExpression(expression)) {
                    const callee = expression.callee;
                    if (
                        callee.type === 'Identifier' &&
                        callee.name === 'wire' &&
                        expression.arguments[0].type === 'Identifier'
                    ) {
                        const adapterName = expression.arguments[0].name;
                        const info =
                            LOCAL_CHANGE_NOT_AWARE_ADAPTERS.get(adapterName);
                        if (info !== undefined) {
                            result.set(expression.arguments[0], info);
                        }
                    }
                }
            }
        });
        return result;
    }
}
