/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { validateJs } from './validateJs';
import { validateGraphql } from './validateGraphql';
import { DiagnosticSettings } from './diagnostic/DiagnosticSettings';

/**
 * Validate the document based on its extension type.
 * For HTML, apply HTML rules.
 * For JavaScript, parse with Babel and apply JavaScript rules.
 * For GraphQL tagged templates, parse the GraphQL string and apply GraphQL rules.
 *
 * @param document Text document to validate.
 * @returns Diagnostic results for the document.
 */
export async function validateDocument(
    setting: DiagnosticSettings,
    document: TextDocument,
    extensionName: string, 
): Promise<Diagnostic[]> {
    const { uri } = document;

 //   const setting = await getDocumentSettings(uri);

    const results: Diagnostic[] = [];

    if (document.languageId === 'javascript') {
        // handles JS rules
        const jsDiagnostics = await validateJs(
            setting,
            document,
            setting.maxNumberOfProblems - results.length
        );
        results.push(...jsDiagnostics);

        // handle graphql rules
        const graphqlDiagnostics = await validateGraphql(
            setting,
            document,
            setting.maxNumberOfProblems - results.length
        );
        results.push(...graphqlDiagnostics);
    }

    if (document.languageId === 'html') {
    }

    // Set the source for diagnostic source.
    results.forEach((diagnostic) => {
        diagnostic.source = extensionName;
    });

    return results;
}
