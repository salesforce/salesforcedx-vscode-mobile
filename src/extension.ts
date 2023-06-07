/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TemplateChooserCommand } from './commands/templateChooserCommand';
import { BriefcaseCommand } from './commands/briefcaseCommand';
import { DeployToOrgCommand } from './commands/deployToOrgCommand';
import { ConfigureProjectCommand } from './commands/configureProjectCommand';
import { InstructionsWebviewProvider } from './webviews';
import { messages } from './messages/messages';

const wizardCommand = 'salesforcedx-vscode-offline-app.onboardingWizard';
const onboardingWizardStateKey =
    'salesforcedx-vscode-offline-app.onboardingWizard.projectCreationState';

enum OnboardingWizardState {
    projectCreated
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
    vscode.commands.registerCommand(
        wizardCommand,
        async (fromPostProjectCreation: boolean = false) => {
            if (fromPostProjectCreation) {
                await OnboardingCommands.deployToOrg();
                await OnboardingCommands.setupBriefcase(context.extensionUri);
                await LandingPageCommand.buildLandingPage();
                // await OnboardingCommands.deploy();

                InstructionsWebviewProvider.showDismissableInstructions(
                    context.extensionUri,
                    messages.getMessage('salesforce_mobile_app_instruction'),
                    'src/instructions/salesforcemobileapp.html'
                );

            } else {
                const projectDir =
                    await ConfigureProjectCommand.configureProject(true);
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
}

// This method is called when your extension is deactivated
export function deactivate() {}
