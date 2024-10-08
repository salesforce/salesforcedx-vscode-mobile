
/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ASTNode} from 'graphql';
import { gqlPluckFromCodeStringSync } from '@graphql-tools/graphql-tag-pluck';
import { Diagnostic } from 'vscode-languageserver/node';
import { DiagnosticProducer } from './diagnostic/DiagnosticProducer';
import { MissingUiapi } from './diagnostic/gql/missing_uiapi';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parse } from 'graphql'


const diagnosticProducers: DiagnosticProducer<ASTNode>[] = [];
diagnosticProducers.push(new MissingUiapi());

/**
 * validate the graphql queries in the document.
 * @param maxCount  the max count of diagnostics to return 
 * @param textDocument 
 * @param fileContent 
 */
export async function validateGraphql(
    maxCount: number,
    textDocument: TextDocument, 
    fileContent: string
): Promise<Diagnostic[]> {
    const results: Diagnostic[] = [];

    if (maxCount <= 0 || diagnosticProducers.length === 0) {
        return results;
    }

    // Find the gql``s in the file content
    const graphQueries = gqlPluckFromCodeStringSync(
        textDocument.uri,
        fileContent,
        {
            skipIndent: true
        }
    );

    // Validate each query
    for (const query of graphQueries) {
        if (results.length >= maxCount) {
            break;
        }
        const lineOffset = query.locationOffset.line - 1;
        const columnOffset = query.locationOffset.column + 1;
        const diagnostics = await validateOneGraphQuery(textDocument, query.body);
        // Update the range offset correctly
        for (const item of diagnostics) {
            if (results.length >= maxCount) {
                break;
            }
            updateDiagnosticOffset(item, lineOffset, columnOffset);
            results.push(item);
        }
    }

    return results;
}

/**
 * Validate graphql diagnostic rules to a graph query. 
 * @param graphql the graph code
 * @param graphqlDiagnosticProducers  the collection of graphql rules. 
 */
async function validateOneGraphQuery(textDocument: TextDocument, graphql: string): Promise<Diagnostic[]> {
    const results: Diagnostic[] = []; 
    const graphqlAstNode = parse(graphql);

    for (const producer of diagnosticProducers) {
        (await producer.validateDocument(textDocument, graphqlAstNode)).forEach((it) => {
            results.push(it);
        });
    }
    return results;
}

/**
 * Update the graphql diagnostic offset to offset from the whole js file
 * @param diagnostic 
 * @param lineOffset line offset from the file
 * @param columnOffset column offset from the file
 */
function updateDiagnosticOffset(diagnostic: Diagnostic, lineOffset: number, columnOffset: number) {

    const start = diagnostic.range.start;
    const end = diagnostic.range.end;
    start.line += lineOffset;
    start.character += columnOffset;

    end.line += lineOffset;
    end.character += columnOffset;
}