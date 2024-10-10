/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { Node } from '@babel/types';
import { DiagnosticProducer } from './diagnostic/DiagnosticProducer';
import { AdaptersLocalChangeNotAware } from './diagnostic/js/adapters_localChangeNotAware';
import { getDocumentSettings } from './server';
import { validateJs } from './validateJs';

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
    document: TextDocument
): Promise<Diagnostic[]> {
    const setting = await getDocumentSettings(document.uri);

    const fileContent = document.getText();

    const results: Diagnostic[] = [];

    const maxCount = setting.maxNumberOfProblems;

    if (document.languageId === 'javascript') {
        // Handles JS rules
        const diagnostics = await validateJs(fileContent, document, maxCount);
        results.push(...diagnostics);

        // TODO: Handle GraphQL
    }

    return results;
}
