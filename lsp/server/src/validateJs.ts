/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseJs } from './utils/babelUtil';
import { Node } from '@babel/types';
import { DiagnosticProducer } from './diagnostic/DiagnosticProducer';
import { AdaptersLocalChangeNotAware } from './diagnostic/js/adapters-local-change-not-aware';

const jsDiagnosticProducers: DiagnosticProducer<Node>[] = [
    new AdaptersLocalChangeNotAware()
];

/**
 * Validate JavaScript file content.
 * @param fileContent The JavaScript file content
 * @returns An array of diagnostics found within the JavaScript file
 */
export async function validateJs(
    textDocument: TextDocument
): Promise<Diagnostic[]> {
    let results: Diagnostic[] = [];

    try {
        const jsNode = parseJs(textDocument.getText());
        for (const producer of jsDiagnosticProducers) {
            const diagnostics = await producer.validateDocument(
                textDocument,
                jsNode
            );
            results = results.concat(diagnostics);
        }
    } catch (e) {} // Silence error since JS parsing error crashes app.

    return results;
}
