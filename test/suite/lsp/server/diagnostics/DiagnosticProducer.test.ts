/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { suite, test } from 'mocha';
import { DiagnosticProducer } from '../../../../../src/lsp/server/diagnostics/DiagnosticProducer';
import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as assert from 'assert';

suite('DiagnosticProducer Test Suite - Server', ()=>{

    test('getBaseDocUrl returns correct value', () => {
        const sampleProducer = new SampleProducer('https://abc.com');
        const fullUrl = sampleProducer.getDocUrl();
        assert.equal(fullUrl, 'https://abc.com/sample-rule-id.md')
    });

    test('getBaseDocUrl returns correct value', () => {
        const sampleProducer = new SampleProducer('https://abc.com', false);
        const fullUrl = sampleProducer.getDocUrl();
        assert.equal(fullUrl, undefined);
    });

});

class SampleProducer extends DiagnosticProducer<string> {
    hasDoc: boolean;
    constructor(baseDocUrl: string, hasDoc: boolean = true) {
        super(baseDocUrl);
        this.hasDoc = hasDoc;
    }

    getId(): string {
       return 'sample-rule-id';
    }

    hasDocumentation(): boolean {
        return this.hasDoc;
    }

    validateDocument(textDocument: TextDocument, data: string): Promise<Diagnostic[]> {
       return Promise.resolve([]);
    }
}



