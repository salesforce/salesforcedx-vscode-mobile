/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { window, QuickPickItem, QuickPickItemKind, QuickPick } from 'vscode';

/**
 * Convenience wrapper for VS Code UI Extension methods such as showQuickPick().
 */
export class UIUtils {
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
                    reject("Nothing selected");
                }
            });

            quickPick.onDidHide((e) => {
                quickPick.dispose();
                reject("Hiding");
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
}
