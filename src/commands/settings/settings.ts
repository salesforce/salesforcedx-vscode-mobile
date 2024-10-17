/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';

const extensionId = 'salesforce.salesforcedx-vscode-mobile';

export function registerCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        `${extensionId}.lsp.updateDiagnosticsSetting`,
        async (diagnosticSetting) => {
            const config = vscode.workspace.getConfiguration(extensionId);
            try {
                await config.update('lsp.diagnostics', diagnosticSetting, vscode.ConfigurationTarget.Workspace);
            } catch(error) {
                const i = 100;
            }
        }
    ));
}