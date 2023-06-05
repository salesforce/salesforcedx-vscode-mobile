import { window, QuickPickItem, QuickPickItemKind, QuickPick } from "vscode";

export class UIUtils {

    static async showQuickPick(
        placeholderMessage: string,
        progressMessage: string | undefined,
        optionsCallback: () => Promise<QuickPickItem[]>): Promise<QuickPickItem> {

        return new Promise<QuickPickItem>(async (resolve, reject) => {
            let selectedItem: QuickPickItem | undefined;
            const quickPick = window.createQuickPick();

            quickPick.onDidChangeSelection((selectedItems) => {
                if (selectedItems && selectedItems.length > 0) {
                    selectedItem = selectedItems[0];
                }

                if (selectedItem) {
                    resolve(selectedItem);
                } else {
                    reject();
                }

                quickPick.dispose();
            });

            if (progressMessage) {
                quickPick.busy = true;
                quickPick.placeholder = progressMessage;
                quickPick.enabled = false;
                quickPick.ignoreFocusOut = true;
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