/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { OnboardingCommands } from './onboardingCommands';
import { LandingPageCommand } from './landingPage/landingPageCommand';
import { InstructionsWebviewProvider } from './webviews';
import { messages } from './messages/messages';

const wizardCommand = 'salesforcedx-vscode-offline-app.onboardingWizard';
const onboardingWizardStateKey =
    'salesforcedx-vscode-offline-app.onboardingWizard.projectCreationState';

enum OnboardingWizardState {
    projectCreated
}

export function showInstructionWebView(
    extensionUri: vscode.Uri,
    tabName: string,
    htmlPath: string
) {
    const provider: InstructionsWebviewProvider =
        new InstructionsWebviewProvider(extensionUri);
    provider.showInstructionWebview(tabName, htmlPath, [
        {
            buttonId: 'okButton',
            action: (panel) => {
                panel.dispose();
            }
        }
    ]);
}

export function activate(context: vscode.ExtensionContext) {
    // If activation is coming as the result of the project being created and newly
    // loaded into the workspace, pick up with the next step of the wizard.
    const isPostProjectCreation =
        context.globalState.get(onboardingWizardStateKey) ===
        OnboardingWizardState.projectCreated;
    if (isPostProjectCreation) {
        context.globalState.update(onboardingWizardStateKey, undefined);
        vscode.commands.executeCommand(wizardCommand, true);
    }
    let disposable = vscode.commands.registerCommand(
        wizardCommand,
        async (fromPostProjectCreation: boolean = false) => {
            if (fromPostProjectCreation) {
                await OnboardingCommands.deployToOrg();
                await OnboardingCommands.setupBriefcase(context.extensionUri);
                await LandingPageCommand.buildLandingPage();

                showInstructionWebView(
                    context.extension.extensionUri,
                    messages.getMessage('salesforce_mobile_app_instruction'),
                    'src/instructions/salesforcemobileapp.html'
                );
            } else {
                const projectDir = await OnboardingCommands.configureProject(
                    true
                );
                if (projectDir === '') {
                    // No directory selected.
                    return Promise.resolve();
                }
                context.globalState.update(
                    onboardingWizardStateKey,
                    OnboardingWizardState.projectCreated
                );
            }
        }
    );

    disposable = vscode.commands.registerCommand(
        'com.salesforce.sandbox.starterkit.configureProject',
        () => {
            OnboardingCommands.configureProject();
        }
    );
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
        'com.salesforce.sandbox.starterkit.deployProject',
        () => {
            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            vscode.window.showInformationMessage('Hello VSCode!');
        }
    );
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
        'com.salesforce.sandbox.starterkit.landingPage',
        () => {
            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            vscode.window.showInformationMessage('Hello VSCode!');
        }
    );
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
        'com.salesforce.sandbox.starterkit.sObjectSetup',
        () => {
            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            vscode.window.showInformationMessage('Hello VSCode!');
        }
    );
    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
