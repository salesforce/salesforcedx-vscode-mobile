/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Diagnostic } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { MobileSettings } from "./server";
import { parseJs } from "./utils/babelUtil";
import { Node } from '@babel/types';
import { DiagnosticProducer } from "./diagnostic/DiagnosticProducer";
import { AdaptersLocalChangeNotAware } from "./diagnostic/js/adapters_localChangeNotAware";


const jsDiagnosticProducers: DiagnosticProducer<Node>[] = [];
jsDiagnosticProducers.push(new AdaptersLocalChangeNotAware());

/**
 * validate the js file content
 * @param fileContent js file content
 * @param results the diagnostic result list
 * @param setting 
 * @param textDocument 
 * @returns 
 */
export async function validateJs(
    fileContent: string, 
    results: Diagnostic[], 
    setting: MobileSettings, 
    textDocument: TextDocument
) {
    if (results.length >setting.maxNumberOfProblems) {
        return
    }  

    if (jsDiagnosticProducers.length > 0) {
        // TODO: the try catch should only be on parsing. 
        try {
            const jsNode = parseJs(fileContent);
            for (const producer of jsDiagnosticProducers) {
                if (results.length > setting.maxNumberOfProblems) {
                    break;
                }

                const diagnostics = await producer.validateDocument(
                    textDocument,
                    jsNode
                );
                results.push(...diagnostics);
            }
        } catch (e) { }
    }
}
