/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import * as fs from 'fs';

export const MESSAGING_SCRIPT_PATH_DEMARCATOR = '--- MESSAGING_SCRIPT_SRC ---';
export const MESSAGING_JS_PATH = 'src/instructions/webviewMessaging.js';
const INSTRUCTION_VIEW_TYPE = 'instructionsView';

export type ButtonAction = {
    buttonId: string;
    action: (panel: vscode.WebviewPanel) => void;
};

export class InstructionsWebviewProvider {
    extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    public showInstructionWebview(
        title: string,
        contentPath: string,
        buttonActions: ButtonAction[]
    ) {
        const panel = vscode.window.createWebviewPanel(
            INSTRUCTION_VIEW_TYPE,
            title,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [this.extensionUri]
            }
        );

        panel.webview.onDidReceiveMessage((data) => {
            const clickedButtonId = data.button;
            const buttonAction = buttonActions.find((action) => {
                return action.buttonId === clickedButtonId;
            });
            if (buttonAction) {
                buttonAction.action(panel);
            }
        });

        const localeContentPath = this.getLocaleContentPath(
            this.extensionUri,
            contentPath
        );
        const htmlPath = vscode.Uri.joinPath(
            this.extensionUri,
            localeContentPath
        );
        const messagingJsPath = vscode.Uri.joinPath(
            this.extensionUri,
            MESSAGING_JS_PATH
        );

        let webviewContent = fs.readFileSync(htmlPath.fsPath, {
            encoding: 'utf-8'
        });
        webviewContent = webviewContent.replace(
            MESSAGING_SCRIPT_PATH_DEMARCATOR,
            panel.webview.asWebviewUri(messagingJsPath).toString()
        );
        panel.webview.html = webviewContent;
    }

    public static showDismissableInstructions(
        extensionUri: vscode.Uri,
        title: string,
        contentPath: string
    ) {
        const provider: InstructionsWebviewProvider =
            new InstructionsWebviewProvider(extensionUri);
        provider.showInstructionWebview(title, contentPath, [
            {
                buttonId: 'okButton',
                action: (panel) => {
                    panel.dispose();
                }
            }
        ]);
    }

    /**
     * Check to see if a locale-specific file exists, otherwise return the default.
     * @param extensionUri Uri representing the path to this extension, supplied by vscode.
     * @param contentPath The relative path (and filename) of the content to display.
     */
    getLocaleContentPath(
        extensionUri: vscode.Uri,
        contentPath: string
    ): string {
        const language = vscode.env.language;

        // check to see if a file exists for this locale.
        const localeContentPath = contentPath.replace(
            /\.html$/,
            `.${language}.html`
        );

        const fullPath = vscode.Uri.joinPath(extensionUri, localeContentPath);

        if (fs.existsSync(fullPath.fsPath)) {
            // a file exists for this locale, so return it instead.
            return localeContentPath;
        } else {
            // fall back
            return contentPath;
        }
    }
}
