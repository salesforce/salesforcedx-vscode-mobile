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
import * as configureLintingToolsCommand from './commands/lint/configureLintingToolsCommand';
import * as liveKomaciAnalyze from './commands/toolingHub/liveKomaciAnalyze';

import { CoreExtensionService } from './services/CoreExtensionService';
import { WorkspaceUtils } from './utils/workspaceUtils';

export function activate(context: vscode.ExtensionContext) {
    // We need to do this first in case any other services need access to those provided by the core extension
    try {
        CoreExtensionService.loadDependencies();
    } catch (err) {
        console.error(err);
        vscode.window.showErrorMessage(
            vscode.l10n.t(
                'Failed to activate the extension! Could not load required services from the Salesforce Extension Pack: {0}',
                (err as Error).message
            )
        );
        return;
    }

    vscode.commands.executeCommand(
        'setContext',
        'sfdx_project_opened',
        WorkspaceUtils.isSfdxProjectOpened()
    );

    onboardingWizard.registerCommand(context);
    onboardingWizard.onActivate(context);

    configureLintingToolsCommand.registerCommand(context);

    liveKomaciAnalyze.registerCommand(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
