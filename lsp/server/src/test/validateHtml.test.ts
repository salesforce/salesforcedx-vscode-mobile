/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateHtml } from '../validateHtml';
import { suite, test } from 'mocha';
import * as assert from 'assert';

suite('Diagnostics Test Suite - Server - Validate html', () => {
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
        
        const diagnostics = await validateHtml({}, textDocument);
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
        
        const diagnostics = await validateHtml({}, textDocument);
        assert.equal(diagnostics.length, 3);
    });
});
