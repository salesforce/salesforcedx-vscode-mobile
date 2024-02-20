/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';

const configureLintToolsCommand = 'salesforcedx-vscode-offline-app.configureLintTools';

export function onActivate(context: vscode.ExtensionContext) {
    console.log('Activated');
}

export function registerCommand(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand(
        configureLintToolsCommand,
        async () => {
            return Promise.resolve();
        }
    );
}
