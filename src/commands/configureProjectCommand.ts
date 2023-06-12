/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Uri, WebviewPanel, commands, window } from 'vscode';
import * as process from 'process';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { InstructionsWebviewProvider } from '../webviews';

export class ConfigureProjectCommand {
    extensionUri: Uri;

    constructor(extensionUri: Uri) {
        this.extensionUri = extensionUri;
    }

    async configureProject(): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            const webview = new InstructionsWebviewProvider(
                this.extensionUri
            ).showInstructionWebview(
                'Offline Starter Kit: Create or Open Project',
                'src/instructions/projectBootstrapChoice.html',
                [
                    {
                        buttonId: 'createNewButton',
                        action: async (panel) => {
                            try {
                                // It's actually important to run this async,
                                // because createNewProject() will not resolve
                                // its Promise until a path is selected,
                                // allowing the user to cancel the open dialog
                                // and re-initiate it as many times as they want.
                                this.createNewProject(panel).then((path) => {
                                    return resolve(path);
                                });
                            } catch (error) {
                                return reject(error);
                            }
                        }
                    },
                    {
                        buttonId: 'openExistingButton',
                        action: async (panel) => {
                            // See above for rationale for running this async.
                            this.openExistingProject(panel).then((path) => {
                                return resolve(path);
                            });
                        }
                    }
                ]
            );
        });
    }

    private async createNewProject(panel: WebviewPanel): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const folderUri = await window.showOpenDialog({
                openLabel: 'Select project folder',
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false
            });
            if (!folderUri || folderUri.length === 0) {
                return;
            }

            panel.dispose();
            new InstructionsWebviewProvider(
                this.extensionUri
            ).showInstructionWebview(
                'Offline Starter Kit: Follow the Prompts',
                'src/instructions/projectBootstrapAcknowledgment.html',
                [
                    {
                        buttonId: 'okButton',
                        action: async (panel) => {
                            panel.dispose();
                            try {
                                const path = await this.executeProjectCreation(
                                    folderUri[0]
                                );
                                return resolve(path);
                            } catch (error) {
                                return reject(error);
                            }
                        }
                    }
                ]
            );
        });
    }

    private async openExistingProject(panel: WebviewPanel): Promise<string> {
        return new Promise(async (resolve) => {
            const folderUri = await window.showOpenDialog({
                openLabel: 'Select project folder',
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false
            });
            if (!folderUri || folderUri.length === 0) {
                return;
            }

            try {
                await this.validateProjectFolder(folderUri[0]);
            } catch (error) {
                window.showErrorMessage((error as Error).message);
                return;
            }

            panel.dispose();
            new InstructionsWebviewProvider(
                this.extensionUri
            ).showInstructionWebview(
                'Offline Starter Kit: Follow the Prompts',
                'src/instructions/projectBootstrapAcknowledgment.html',
                [
                    {
                        buttonId: 'okButton',
                        action: async (panel) => {
                            panel.dispose();
                            await commands.executeCommand(
                                'vscode.openFolder',
                                folderUri[0],
                                { forceReuseWindow: true }
                            );
                            return resolve(folderUri[0].fsPath);
                        }
                    }
                ]
            );
        });
    }

    private async executeProjectCreation(folderUri: Uri): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const githubRepoUri: string =
                'https://github.com/salesforce/offline-app-developer-starter-kit.git';
            try {
                await commands.executeCommand(
                    'git.clone',
                    githubRepoUri,
                    folderUri.fsPath
                );
                return resolve(folderUri.fsPath);
            } catch (error) {
                window.showErrorMessage(`Failed to clone: ${error}`);
                return reject(error);
            }
        });
    }

    private async validateProjectFolder(projectFolderUri: Uri): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const origWorkingDir = process.cwd();
            try {
                // Can we chdir to the selected folder?
                try {
                    process.chdir(projectFolderUri.fsPath);
                } catch (error) {
                    return reject(
                        new Error(
                            `Could not access the project folder at '${projectFolderUri.fsPath}'.`
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
                    return reject(new Error('git is not installed.'));
                }

                // Is this a git repo?
                try {
                    await CommonUtils.executeCommandAsync('git status');
                } catch (error) {
                    return reject(
                        new Error(
                            `Folder '${projectFolderUri.fsPath}' does not contain a git repository.`
                        )
                    );
                }

                // Is this the Offline Starter Kit repo?
                try {
                    const oskInitialCommit =
                        '99b1fa9377694beb7918580aab445a2e9981f611';
                    await CommonUtils.executeCommandAsync(
                        `git merge-base HEAD ${oskInitialCommit}`
                    );
                } catch (error) {
                    return reject(
                        new Error(
                            'This git repository does not share history with the Offline Starter Kit.'
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
