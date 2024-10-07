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
import { parseJs } from './utils/babelUtil';

const jsDiagnosticProducers: DiagnosticProducer<Node>[] = [];
jsDiagnosticProducers.push(new AdaptersLocalChangeNotAware());
import { getDocumentSettings } from './server';

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
    const setting = await getDocumentSettings(document.uri);

    const results: Diagnostic[] = [];

    if (document.languageId === 'javascript') {
        // handles JS rules
        if (jsDiagnosticProducers.length > 0) {
            try {
                const jsNode = parseJs(document.getText());
                for (const producer of jsDiagnosticProducers) {
                    if (results.length > setting.maxNumberOfProblems) {
                        break;
                    }

                    const diagnostics = await producer.validateDocument(
                        document,
                        jsNode
                    );
                    results.push(...diagnostics);
                }
            } catch (e) {}
        }
    }

    return results;
}
