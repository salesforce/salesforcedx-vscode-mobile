/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Uri, WebviewPanel, commands, l10n, window } from 'vscode';
import * as process from 'process';
import { CommonUtils } from '../../utils/CommonUtils';
import { InstructionsWebviewProvider } from '../../webviews/instructions';
import { wizardCommand } from './onboardingWizard';
import { CoreExtensionService } from '../../services/CoreExtensionService';

export type ProjectManagementChoiceAction = (panel?: WebviewPanel) => void;

export interface ProjectConfigurationProcessor {
    getProjectManagementChoice(
        createChoice: ProjectManagementChoiceAction,
        openChoice: ProjectManagementChoiceAction
    ): void;
    getProjectFolderPath(): Promise<Uri[] | undefined>;
    preActionUserAcknowledgment(): Promise<void>;
    executeProjectCreation(folderUri: Uri): Promise<string>;
    executeProjectOpen(folderUri: Uri): Promise<void>;
}

export class DefaultProjectConfigurationProcessor
    implements ProjectConfigurationProcessor
{
    extensionUri: Uri;

    constructor(extensionUri: Uri) {
        this.extensionUri = extensionUri;
    }

    async preActionUserAcknowledgment(): Promise<void> {
        return new Promise((resolve) => {
            new InstructionsWebviewProvider(
                this.extensionUri
            ).showInstructionWebview(
                l10n.t('Offline Starter Kit: Configure Your Project'),
                'resources/instructions/projectBootstrapAcknowledgment.html',
                [
                    {
                        type: 'okButton',
                        action: async (panel) => {
                            panel.dispose();
                            return resolve();
                        }
                    }
                ]
            );
        });
    }

    async executeProjectCreation(folderUri: Uri): Promise<string> {
        return new Promise(async (resolve) => {
            await commands.executeCommand(
                'git.clone',
                ConfigureProjectCommand.STARTER_KIT_REPO_URI,
                folderUri.fsPath
            );
            return resolve(folderUri.fsPath);
        });
    }

    async executeProjectOpen(folderUri: Uri): Promise<void> {
        return new Promise(async (resolve) => {
            await commands.executeCommand('vscode.openFolder', folderUri, {
                forceReuseWindow: true
            });
            return resolve();
        });
    }

    async getProjectFolderPath(): Promise<Uri[] | undefined> {
        return new Promise((resolve) => {
            window
                .showOpenDialog({
                    openLabel: l10n.t('Select project folder'),
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false
                })
                .then((result) => {
                    return resolve(result);
                });
        });
    }

    getProjectManagementChoice(
        createChoice: ProjectManagementChoiceAction,
        openChoice: ProjectManagementChoiceAction
    ): void {
        new InstructionsWebviewProvider(
            this.extensionUri
        ).showInstructionWebview(
            l10n.t('Offline Starter Kit: Create or Open Project'),
            'resources/instructions/projectBootstrapChoice.html',
            [
                {
                    type: 'createNewButton',
                    action: (panel) => {
                        createChoice(panel);
                    }
                },
                {
                    type: 'openExistingButton',
                    action: (panel) => {
                        openChoice(panel);
                    }
                }
            ]
        );
    }
}

export class ConfigureProjectCommand {
    static readonly STARTER_KIT_INITIAL_COMMIT =
        '99b1fa9377694beb7918580aab445a2e9981f611';
    static readonly STARTER_KIT_REPO_URI =
        'https://github.com/salesforce/offline-app-developer-starter-kit.git';

    extensionUri: Uri;
    projectConfigurationProcessor: ProjectConfigurationProcessor;

    constructor(
        extensionUri: Uri,
        projectConfigurationProcessor?: ProjectConfigurationProcessor
    ) {
        this.extensionUri = extensionUri;
        this.projectConfigurationProcessor =
            projectConfigurationProcessor ??
            new DefaultProjectConfigurationProcessor(extensionUri);
    }

    async createProjectAction(
        panel?: WebviewPanel
    ): Promise<string | undefined> {
        return new Promise((resolve) => {
            // It's actually important to run this async, because
            // createNewProject() will not resolve its Promise
            // until a path is selected, allowing the user to
            // cancel the open dialog and re-initiate it as many
            // times as they want.
            this.createNewProject(panel).then((path) => {
                return resolve(path);
            });
        });
    }

    async openProjectAction(panel?: WebviewPanel): Promise<string | undefined> {
        return new Promise((resolve) => {
            // It's actually important to run this async, because
            // createNewProject() will not resolve its Promise
            // until a path is selected, allowing the user to
            // cancel the open dialog and re-initiate it as many
            // times as they want.
            this.openExistingProject(panel).then((path) => {
                return resolve(path);
            });
        });
    }

    async configureProject(): Promise<string | undefined> {
        const telemetryService = CoreExtensionService.getTelemetryService();

        // Send marker to record that the command got executed.
        telemetryService.sendCommandEvent(wizardCommand, process.hrtime());

        return new Promise((resolve) => {
            this.projectConfigurationProcessor.getProjectManagementChoice(
                async (panel) => {
                    const path = await this.createProjectAction(panel);
                    return resolve(path);
                },
                async (panel) => {
                    const path = await this.openProjectAction(panel);
                    return resolve(path);
                }
            );
        });
    }

    async createNewProject(panel?: WebviewPanel): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const folderUri =
                await this.projectConfigurationProcessor.getProjectFolderPath();
            if (!folderUri || folderUri.length === 0) {
                // We explicitly do not want to resolve the Promise here, since the
                // user "canceled", but could retry with the action request dialog
                // that's still open. Only resolve the Promise when the user makes
                // a choice.
                return;
            }

            if (panel) {
                panel.dispose();
            }

            this.projectConfigurationProcessor
                .preActionUserAcknowledgment()
                .then(async () => {
                    try {
                        const path =
                            await this.projectConfigurationProcessor.executeProjectCreation(
                                folderUri[0]
                            );
                        return resolve(path);
                    } catch (error) {
                        return reject(error);
                    }
                });
        });
    }

    async openExistingProject(panel?: WebviewPanel): Promise<string> {
        return new Promise(async (resolve) => {
            const folderUri =
                await this.projectConfigurationProcessor.getProjectFolderPath();
            if (!folderUri || folderUri.length === 0) {
                // We explicitly do not want to resolve the Promise here, since the
                // user "canceled", but could retry with the action request dialog
                // that's still open. Only resolve the Promise when the user makes
                // a choice.
                return;
            }

            try {
                await this.validateProjectFolder(folderUri[0]);
            } catch (error) {
                window.showErrorMessage((error as Error).message);
                // Same as above. If they chose an invalid folder, "soft"-error
                // and allow them to pick a different choice.
                return;
            }

            if (panel) {
                panel.dispose();
            }

            this.projectConfigurationProcessor
                .preActionUserAcknowledgment()
                .then(async () => {
                    await this.projectConfigurationProcessor.executeProjectOpen(
                        folderUri[0]
                    );
                    return resolve(folderUri[0].fsPath);
                });
        });
    }

    async validateProjectFolder(projectFolderUri: Uri): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const origWorkingDir = process.cwd();
            try {
                // Can we chdir to the selected folder?
                try {
                    process.chdir(projectFolderUri.fsPath);
                } catch (error) {
                    return reject(
                        new Error(
                            l10n.t(
                                "Could not access the project folder at '{0}'.",
                                projectFolderUri.fsPath
                            )
                        )
                    );
                }

                // Is git installed?
                try {
                    // TODO: There are a number of complexities to solving
                    // for this in the general platform case.
                    // Cf. https://github.com/microsoft/vscode/blob/89ec834df20d597ff96f7d303e7e0f2f055d2a4e/extensions/git/src/git.ts#L145-L165
                    await CommonUtils.executeCommandAsync('git --version');
                } catch (error) {
                    return reject(new Error(l10n.t('git is not installed.')));
                }

                // Is this a git repo?
                try {
                    await CommonUtils.executeCommandAsync('git status');
                } catch (error) {
                    return reject(
                        new Error(
                            l10n.t(
                                "Folder '{0}' does not contain a git repository.",
                                projectFolderUri.fsPath
                            )
                        )
                    );
                }

                // Is this the Offline Starter Kit repo?
                try {
                    await CommonUtils.executeCommandAsync(
                        `git merge-base HEAD ${ConfigureProjectCommand.STARTER_KIT_INITIAL_COMMIT}`
                    );
                } catch (error) {
                    return reject(
                        new Error(
                            l10n.t(
                                "The git repository at '{0}' does not share history with the Offline Starter Kit.",
                                projectFolderUri.fsPath
                            )
                        )
                    );
                }

                return resolve();
            } finally {
                process.chdir(origWorkingDir);
            }
        });
    }
}
