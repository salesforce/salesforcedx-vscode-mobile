/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';
import * as sinon from 'sinon';

import { afterEach } from 'mocha';

suite('JS Diagnostics Test Suite - Client', () => {
    afterEach(function () {
        sinon.restore();
    });
    test('Diagnose local change not aware adapter', async () => {
        const docUri = getDocUri('adapters-localchange-not-aware.js');
        testDiagnostics(docUri, [
            {
                message:
                    'The wire adapter you are using allows you to work offline, but it does not automatically update its records when data is added or removed while you are disconnected.',
                range: toRange(16, 10, 16, 31),
                severity: vscode.DiagnosticSeverity.Information
            }
        ]);
    });
});

function toRange(
    sLine: number,
    sChar: number,
    eLine: number,
    eChar: number
): vscode.Range {
    return new vscode.Range(
        new vscode.Position(sLine, sChar),
        new vscode.Position(eLine, eChar)
    );
}

async function testDiagnostics(
    docUri: vscode.Uri,
    expectedDiagnostics: vscode.Diagnostic[]
) {
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    assert.equal(actualDiagnostics.length, expectedDiagnostics.length);
    expectedDiagnostics.forEach((expectedDiagnostic, i) => {
        const actualDiagnostic = actualDiagnostics[i];
        assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
        assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
        assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
    });
}
