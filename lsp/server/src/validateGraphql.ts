
/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Source } from 'graphql';
import { gqlPluckFromCodeStringSync } from '@graphql-tools/graphql-tag-pluck';
import { Node } from '@babel/types';
import { Diagnostic } from 'vscode-languageserver/node';
import { DiagnosticProducer } from './diagnostic/DiagnosticProducer';
import { MissingUiapi } from './diagnostic/gql/missing_uiapi';
import { MobileSettings } from './server';


const graphqlDiagnosticProducers: DiagnosticProducer<Node>[] = [];
// graphqlDiagnosticProducers.push(new MissingUiapi());

export async function validateGraphql(results: Diagnostic[], setting: MobileSettings, uri: string, fileContent: string) {
    if (graphqlDiagnosticProducers.length > 0 && results.length < setting.maxNumberOfProblems) {
        const graphqlChunks = gqlPluckFromCodeStringSync(
            uri,
            fileContent,
            {
                skipIndent: true
            }
        );

        for (const graphql of graphqlChunks) {
            if (results.length > setting.maxNumberOfProblems) {
                break;
            }
            const lineOffset = graphql.locationOffset.line - 1;
            const columnOffset = graphql.locationOffset.column + 1;
            const diagnostics = await validateGraphQlChunk(graphql, graphqlDiagnosticProducers);
            // Update the range offset correctly
            for (const item of diagnostics) {
                if (results.length > setting.maxNumberOfProblems) {
                    break;
                }
                updateDiagnosticOffset(item, lineOffset, columnOffset);
                results.push(item);
            }
        }
    }
}

/**
 * Validate graphql diagnostic rules to the chunk of graphql. 
 * @param graphql the graph code
 * @param graphqlDiagnosticProducers  the collection of graphql rules. 
 */
async function validateGraphQlChunk(graphql: Source, graphqlDiagnosticProducers: DiagnosticProducer<Node>[]): Promise<Diagnostic[]> {
    const results: Diagnostic[] = [];
    
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