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

const jsDiagnosticProducers: DiagnosticProducer<Node>[] = [];
jsDiagnosticProducers.push(new AdaptersLocalChangeNotAware());

/**
 * process the document based extension type.
 * if html, call html related rules;
 * if js then parse it using babel, call js related rules
 * find the gql taggedTemplates, parse the graphql string and call graphql related rules.
 * @param document the input document to validate.
 * @returns diagnostic results for target document.
 */
export async function validateDocument(
    document: TextDocument
): Promise<Diagnostic[]> {
    const setting = await getDocumentSettings(document.uri);

    const fileContent = document.getText();

    const results: Diagnostic[] = [];

    const maxCount = setting.maxNumberOfProblems;

    if (document.languageId === 'javascript') {
        // handles JS rules
        const diagnostics = await validateJs(fileContent, document, maxCount);
        results.push(...diagnostics);

        // TODO: Handle GraphQL
    }

    return results;
}
