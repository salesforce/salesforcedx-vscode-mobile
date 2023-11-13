/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { window, workspace, QuickPickItem } from 'vscode';
import { access } from 'fs/promises';
import { NoStaticResourcesDirError, NoWorkspaceError } from './workspaceUtils';
import * as path from 'path';

/**
 * Convenience wrapper for VS Code UI Extension methods such as showQuickPick().
 */
export class UIUtils {
    static readonly STATIC_RESOURCES_PATH = path.join(
        'force-app',
        'main',
        'default',
        'staticresources'
    );

    /**
     * Wraps the ability to ask user for a selection from a quick pick list.
     *
     * @param placeholderMessage Message shown to user in the quick pick text entry box.
     * @param progressMessage Message shown while the quick pick is shown, but is not yet enabled due
     *                      to building a list of options via the callback.
     * @param optionsCallback Callback used to provide an array of QuickPickItems.
     * @param ignoreFocusOut Boolean for the ignoreFocusOut option on QuickPick.
     * @returns Promise<QuickPickItem> containing what was chosen by the user, or undefined.
     */
    static async showQuickPick(
        placeholderMessage: string,
        progressMessage: string | undefined = undefined,
        optionsCallback: () => Promise<QuickPickItem[]>,
        ignoreFocusOut: boolean = true
    ): Promise<QuickPickItem> {
        return new Promise<QuickPickItem>(async (resolve, reject) => {
            let selectedItem: QuickPickItem | undefined;
            const quickPick = window.createQuickPick();
            quickPick.ignoreFocusOut = ignoreFocusOut;

            quickPick.onDidChangeSelection((selectedItems) => {
                if (selectedItems && selectedItems.length > 0) {
                    selectedItem = selectedItems[0];
                }

                if (selectedItem) {
                    resolve(selectedItem);
                } else {
                    reject('Nothing selected');
                }
            });

            quickPick.onDidHide((e) => {
                quickPick.dispose();
                reject('Hiding');
            });

            if (progressMessage) {
                quickPick.busy = true;
                quickPick.placeholder = progressMessage;
                quickPick.enabled = false;
                quickPick.show();
            }

            const items = await optionsCallback();
            quickPick.placeholder = placeholderMessage;
            quickPick.items = items;
            quickPick.busy = false;
            quickPick.enabled = true;
            quickPick.show();
        });
    }

    static getWorkspaceDir(): string {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new NoWorkspaceError(
                'No workspace defined for this project.'
            );
        }
        return workspaceFolders[0].uri.fsPath;
    }

    static async getStaticResourcesDir(): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let projectPath: string;
            try {
                projectPath = this.getWorkspaceDir();
            } catch (err) {
                return reject(err);
            }
            const staticResourcesPath = path.join(
                projectPath,
                this.STATIC_RESOURCES_PATH
            );
            try {
                await access(staticResourcesPath);
            } catch (err) {
                const noAccessError = new NoStaticResourcesDirError(
                    `Could not read static resources directory at '${staticResourcesPath}'`
                );

                return reject(noAccessError);
            }
            return resolve(staticResourcesPath);
        });
    }
}
