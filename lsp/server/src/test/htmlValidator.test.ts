/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { suite, test } from 'mocha';
import { HTMLValidator } from '../validator/htmlValidator';
import * as assert from 'assert';
import { MobileOfflineFriendly } from '../diagnostic/html/mobileOfflineFriendly';

suite('Diagnostics Test Suite - Server - HTML Validator', () => {
    const htmlValidator: HTMLValidator = new HTMLValidator();
    htmlValidator.addProducer(new MobileOfflineFriendly());

    test('Correct number of non-friendly mobile offline base components is determined', async () => {
        const textDocument = TextDocument.create(
            'file://test.html',
            'html',
            1,
            `
            <template>
                <lightning-accordion>
                </lightning-accordion>
                <lightning-datatable>
                </lightning-datatable>
                <lightning-badge>
                </lightning-badge>
                <lightning-file-upload>
                </lightning-file-upload>
            </template>
            `
        );

        const htmlSections =
            htmlValidator.gatherDiagnosticSections(textDocument);
        assert.equal(htmlSections.length, 1);

        const diagnostics = await htmlValidator.validateData(
            {},
            textDocument,
            htmlSections[0].data
        );
        assert.equal(diagnostics.length, 2);
    });

    test('Correct number of nested non-friendly mobile offline base components is determined', async () => {
        const textDocument = TextDocument.create(
            'file://test.html',
            'html',
            1,
            `
            <template>
                <div>
                    <lightning-datatable>
                    </lightning-datatable>
                    <div>
                        <lightning-file-upload>
                        </lightning-file-upload>
                        <div>
                            <lightning-input-rich-text>
                            </lightning-input-rich-text>
                        </div>
                    </div>
                </div>
            </template>
            `
        );

        const htmlSections =
            htmlValidator.gatherDiagnosticSections(textDocument);
        assert.equal(htmlSections.length, 1);

        const diagnostics = await htmlValidator.validateData(
            {},
            textDocument,
            htmlSections[0].data
        );
        assert.equal(diagnostics.length, 3);
    });
});
