/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { parse, ASTNode } from 'graphql';
import { gqlPluckFromCodeStringSync } from '@graphql-tools/graphql-tag-pluck';
import { Diagnostic } from 'vscode-languageserver/node';
import { DiagnosticProducer } from './diagnostic/DiagnosticProducer';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { MisspelledUiapi } from './diagnostic/gql/misspelled-uiapi';
import {
    DiagnosticSettings,
    isTheDiagnosticSuppressed
} from './diagnostic/DiagnosticSettings';

const diagnosticProducers: DiagnosticProducer<ASTNode>[] = [
    new MisspelledUiapi()
];

/**
 * Validate the graphql queries in the document.
 * @param textDocument
 */
export async function validateGraphql(
    setting: DiagnosticSettings,
    textDocument: TextDocument
): Promise<Diagnostic[]> {
    const results: Diagnostic[] = [];

    const producers = diagnosticProducers.filter((producer) => {
        return !isTheDiagnosticSuppressed(setting, producer.getId());
    });

    if (producers.length === 0) {
        return results;
    }

    // Find the gql``s in the file content
    const graphQueries = gqlPluckFromCodeStringSync(
        textDocument.uri,
        textDocument.getText(),
        {
            skipIndent: true,
            globalGqlIdentifierName: ['gql', 'graphql']
        }
    );

    // Validate each query
    for (const query of graphQueries) {
        const lineOffset = query.locationOffset.line - 1;
        const columnOffset = query.locationOffset.column + 1;
        const graphqlTextDocument = TextDocument.create(
            ``,
            'graphql',
            1,
            query.body
        );
        const diagnostics = await validateOneGraphQuery(
            producers,
            graphqlTextDocument,
            query.body
        );
        // Update the range offset correctly
        for (const item of diagnostics) {
            updateDiagnosticOffset(item, lineOffset, columnOffset);
            results.push(item);
        }
    }

    return results;
}

/**
 * Validate graphql diagnostic rules to a graph query, return empty list if the graphql string is invalid.
 * @param producers The diagnostic producer to run.
 * @param graphql the graph code
 * @param graphqlDiagnosticProducers  the collection of graphql rules.
 */
export async function validateOneGraphQuery(
    producers: DiagnosticProducer<ASTNode>[],
    textDocument: TextDocument,
    graphql: string
): Promise<Diagnostic[]> {
    try {
        const graphqlAstNode = parse(graphql);
        const allResults = await Promise.all(
            producers.map((producer) => {
                return producer
                    .validateDocument(textDocument, graphqlAstNode)
                    .then((diagnostics) => {
                        const producerId = producer.getId();
                        diagnostics.forEach((diagnostic) => {
                            diagnostic.data = producerId;
                        });
                        return diagnostics;
                    });
            })
        );
        return allResults.flat();
    } catch (e) {
        // Graphql string fails to parse will not produce diagnostic
    }

    return [];
}

/**
 * Update the graphql diagnostic offset to offset from the whole js file
 * @param diagnostic
 * @param lineOffset Line offset from the file
 * @param columnOffset Column offset from the file
 */
function updateDiagnosticOffset(
    diagnostic: Diagnostic,
    lineOffset: number,
    columnOffset: number
) {
    const start = diagnostic.range.start;
    const end = diagnostic.range.end;

    // Only add the column offset for first line.
    if (start.line === 0) {
        start.character += columnOffset;
    }
    if (end.line === 0) {
        end.character += columnOffset;
    }

    start.line += lineOffset;
    end.line += lineOffset;
}
