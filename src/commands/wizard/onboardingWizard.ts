/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import { TemplateChooserCommand } from './templateChooserCommand';
import { BriefcaseCommand } from './briefcaseCommand';
import { DeployToOrgCommand } from './deployToOrgCommand';
import { ConfigureProjectCommand } from './configureProjectCommand';
import { AuthorizeCommand } from './authorizeCommand';
import { InstructionsWebviewProvider } from '../../webviews/instructions';
import { LwcGenerationCommand } from './lwcGenerationCommand';

const wizardCommand = 'salesforcedx-vscode-offline-app.onboardingWizard';
const onboardingWizardStateKey =
    'salesforcedx-vscode-offline-app.onboardingWizard.projectCreationState';

enum OnboardingWizardState {
    projectConfigured
}

async function runPostProjectConfigurationSteps(
    extensionUri: vscode.Uri
): Promise<void> {
    return new Promise(async (resolve) => {
        await AuthorizeCommand.authorizeToOrg();
        await BriefcaseCommand.setupBriefcase(extensionUri);
        await TemplateChooserCommand.chooseTemplate(extensionUri);
        await LwcGenerationCommand.createSObjectLwcQuickActions(extensionUri);

        await AuthorizeCommand.authorizeToOrg();
        await DeployToOrgCommand.deployToOrg();

        await InstructionsWebviewProvider.showDismissableInstructions(
            extensionUri,
            vscode.l10n.t('View in the Salesforce Mobile App'),
            'resources/instructions/salesforcemobileapp.html'
        );
        return resolve();
    });
}

export function onActivate(context: vscode.ExtensionContext) {
    // If activation is coming as the result of the project being newly
    // loaded into the workspace, pick up with the next step of the wizard.
    const isPostProjectConfiguration =
        context.globalState.get(onboardingWizardStateKey) ===
        OnboardingWizardState.projectConfigured;
    if (isPostProjectConfiguration) {
        context.globalState.update(onboardingWizardStateKey, undefined);
        vscode.commands.executeCommand(wizardCommand, true);
    }
}

export function registerCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        wizardCommand,
        async (fromPostProjectConfiguration: boolean = false) => {
            if (fromPostProjectConfiguration) {
                await runPostProjectConfigurationSteps(context.extensionUri);
            } else {
                const projectDir = await new ConfigureProjectCommand(
                    context.extensionUri
                ).configureProject();
                if (!projectDir) {
                    // No directory selected. Do not continue.
                    return Promise.resolve();
                } else if (
                    vscode.workspace.workspaceFolders &&
                    vscode.workspace.workspaceFolders.length > 0 &&
                    vscode.workspace.workspaceFolders[0].uri.fsPath ===
                        projectDir
                ) {
                    // Selected folder is already loaded into the workspace.
                    // Run the next steps directly, because the workspace will
                    // not reload in this case.
                    await runPostProjectConfigurationSteps(
                        context.extensionUri
                    );
                } else {
                    // Different project folder from what's currently loaded
                    // into the workspace. The workspace will reload,
                    // and we need to set a breadcrumb to pick up with the
                    // next steps, after it does.
                    context.globalState.update(
                        onboardingWizardStateKey,
                        OnboardingWizardState.projectConfigured
                    );
                }
            }
        }
    );
    context.subscriptions.push(disposable);
}
