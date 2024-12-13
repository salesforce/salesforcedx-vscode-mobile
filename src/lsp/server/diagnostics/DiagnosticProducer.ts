/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Diagnostic } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export abstract class DiagnosticProducer<T> {
    private baseDocUrl: string;

    constructor(baseDocUrl: string) {
        this.baseDocUrl = baseDocUrl;
    }

    /**
     * Get the Id for the diagnostic producer.
     */
    abstract getId(): string;

    /**
     * Flag to validator if this producer has documentation md file, default to have doc.
     */
    hasDocumentation(): boolean {
        return true;
    }

    /**
     * Get the doc url about the diagnostic produced by this producer.
     */
    getDocUrl(): string | undefined {
        return this.hasDocumentation()
            ? `${this.baseDocUrl}/${this.getId()}.md`
            : undefined;
    }

    /**
     * Validate the parsed text document as astNode and return a list of diagnostics.
     * @param textDocument the language server text document.
     * @param data usually parsed document body.
     * @returns An array of diagnostics found within ast node.
     */
    abstract validateDocument(
        textDocument: TextDocument,
        data: T
    ): Promise<Diagnostic[]>;
}
