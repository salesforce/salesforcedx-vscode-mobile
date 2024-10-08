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

/**
 * process the document based extension type.
 * if html, call html related rules;
 * if js then parse it using babel, call js related rules
 * find the gql taggedTemplates, parse the graphql string and call graphql related rules.
 * @param document the input document to validate.
 */
export async function validateDocument(
    document: TextDocument
): Promise<Diagnostic[]> {
    const { uri } = document;
    const fileContent = document.getText();

    const setting = await getDocumentSettings(uri);

    const results: Diagnostic[] = [];

    if (document.languageId === 'javascript') {
        // handles JS rules
        await validateJs(fileContent, results, setting, document);

        // handle graphql rules
        await validateGraphql(results, setting, uri, fileContent);

    } 
    return results;
}


