/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { getDocumentSettings } from './server';
import { validateJs } from './validateJs';
import { validateGraphql } from './validateGraphql';
import * as vscode from "vscode";

/**
 * process the document based extension type.
 * if html, call html related rules;
 * if js then parse it using babel, call js related rules
 * find the gql taggedTemplates, parse the graphql string and call graphql related rules.
 * @param document the input document to validate.
 */
export async function validateDocument(
    document: TextDocument, 
    extensionName: string
): Promise<Diagnostic[]> {
    const { uri } = document;
    const fileContent = document.getText();

    const setting = await getDocumentSettings(uri);

    const results: Diagnostic[] = [];

    if (document.languageId === 'javascript') {
        // handles JS rules
        const jsDiagnostics=  await validateJs(
            setting.maxNumberOfProblems - results.length, 
            document, 
            fileContent
        );
        results.push(...jsDiagnostics);

        // handle graphql rules
        const graphqlDiagnostics = await validateGraphql(
            setting.maxNumberOfProblems - results.length, 
            document, 
            fileContent
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