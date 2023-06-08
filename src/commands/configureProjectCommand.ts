/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
    ProgressLocation,
    QuickPickItem,
    QuickPickOptions,
    Uri,
    commands,
    window
} from 'vscode';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { InstructionsWebviewProvider } from '../webviews';
import { messages } from '../messages/messages';

export class ConfigureProjectCommand {
    static async configureProject(
        fromWizard: boolean = false
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const header: QuickPickOptions = {
                placeHolder: 'Create a new project, or open an existing project'
            };
            const items: QuickPickItem[] = [
                {
                    label: 'Create New Project...',
                    description:
                        'Creates a new local project configured with the Offline Starter Kit'
                },
                {
                    label: 'Open Existing Project...',
                    description:
                        'Opens an existing local project configured with the Offline Starter Kit'
                }
            ];
            const selected = await window.showQuickPick(items, header);
            if (!selected) {
                return resolve('');
            }

            if (selected.label === 'Create New Project...') {
                const folderUri = await window.showOpenDialog({
                    openLabel: 'Select project folder',
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false
                });
                if (!folderUri || folderUri.length === 0) {
                    return resolve('');
                }

                let infoMessage =
                    'Follow the prompts to configure the project.';
                if (fromWizard) {
                    infoMessage +=
                        ' NOTE: after the project is loaded, please be patient while the wizard resumes.';
                }
                await window.showInformationMessage(infoMessage, {
                    title: 'OK'
                });
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
            } else if (selected.label === 'Open Existing Project...') {
                console.log('Open existing project');
                return resolve('');
            } else {
                return resolve('');
            }
        });
    }
}
