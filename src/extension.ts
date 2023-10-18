/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as onboardingWizard from './commands/wizard/onboardingWizard';

export function activate(context: vscode.ExtensionContext) {
    onboardingWizard.registerCommand(context);
    onboardingWizard.onActivate(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
