/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

suite('should get diagnostics', () => {
    test('Diagnose local change not aware adapter', async () => {
        const docUri = getDocUri('adapters-localchange-not-aware.js');
    });
});
