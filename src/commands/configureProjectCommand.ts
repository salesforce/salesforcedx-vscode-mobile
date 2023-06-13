/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
    QuickPickItem,
    QuickPickOptions,
    commands,
    window,
    l10n
} from 'vscode';

export class ConfigureProjectCommand {
    static async configureProject(
        fromWizard: boolean = false
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const header: QuickPickOptions = {
                placeHolder: l10n.t(
                    'Create a new project, or open an existing project'
                )
            };
            const items: QuickPickItem[] = [
                {
                    label: l10n.t('Create New Project...'),
                    description: l10n.t(
                        'Creates a new local project configured with the Offline Starter Kit'
                    )
                },
                {
                    label: l10n.t('Open Existing Project...'),
                    description: l10n.t(
                        'Opens an existing local project configured with the Offline Starter Kit'
                    )
                }
            ];
            const selected = await window.showQuickPick(items, header);
            if (!selected) {
                return resolve('');
            }

            if (selected.label === l10n.t('Create New Project...')) {
                const folderUri = await window.showOpenDialog({
                    openLabel: l10n.t('Select project folder'),
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false
                });
                if (!folderUri || folderUri.length === 0) {
                    return resolve('');
                }

                let infoMessage = l10n.t(
                    'Follow the prompts to configure the project.'
                );
                if (fromWizard) {
                    infoMessage += l10n.t(
                        ' NOTE: after the project is loaded, please be patient while the wizard resumes.'
                    );
                }
                await window.showInformationMessage(infoMessage, {
                    title: l10n.t('OK')
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
                    window.showErrorMessage(l10n.t('Failed to clone: {error}', [error]));
                    return reject(error);
                }
            } else if (selected.label === l10n.t('Open Existing Project...')) {
                console.log('Open existing project');
                return resolve('');
            } else {
                return resolve('');
            }
        });
    }
}
