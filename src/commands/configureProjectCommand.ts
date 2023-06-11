/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Uri, WebviewPanel, commands, window } from 'vscode';
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
                            const path = await this.openExistingProject(panel);
                            return resolve(path);
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
                                    folderUri
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

    private async openExistingProject(
        panel: WebviewPanel
    ): Promise<string | undefined> {
        return new Promise((resolve, reject) => {});
    }

    private async executeProjectCreation(folderUri: Uri[]): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const githubRepoUri: string =
                'https://github.com/salesforce/offline-app-developer-starter-kit.git';
            try {
                await commands.executeCommand(
                    'git.clone',
                    githubRepoUri,
                    folderUri[0].fsPath
                );
                return resolve(folderUri[0].fsPath);
            } catch (error) {
                window.showErrorMessage(`Failed to clone: ${error}`);
                return reject(error);
            }
        });
    }
}
