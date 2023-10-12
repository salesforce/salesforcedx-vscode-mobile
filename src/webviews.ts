/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import * as fs from 'fs';

export const MESSAGING_SCRIPT_PATH_DEMARCATOR = '--- MESSAGING_SCRIPT_SRC ---';
export const MESSAGING_JS_PATH = 'resources/instructions/webviewMessaging.js';
const INSTRUCTION_VIEW_TYPE = 'instructionsView';

export type WebviewMessageCallback = (responseData?: object) => void;

export type WebviewMessageHandler = {
    type: string;
    action: (
        panel: vscode.WebviewPanel,
        data?: object,
        callback?: WebviewMessageCallback
    ) => void;
};

export class InstructionsWebviewProvider {
    extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    public showInstructionWebview(
        title: string,
        contentPath: string,
        messageHandlers: WebviewMessageHandler[]
    ) {
        this.validateMessageHanders(messageHandlers);
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
            const responsiveHandlers = messageHandlers.filter(
                (messageHandler) => data.type === messageHandler.type
            );
            if (responsiveHandlers.length > 0) {
                const handler = responsiveHandlers[0];
                let callback: WebviewMessageCallback | undefined;
                if (data.callbackId) {
                    const returnedCallbackId = data.callbackId;
                    delete data.callbackId;
                    callback = (responseData?: object) => {
                        const fullResponseMessage = {
                            callbackId: returnedCallbackId,
                            ...responseData
                        };
                        panel.webview.postMessage(fullResponseMessage);
                    };
                }
                handler.action(panel, data, callback);
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

    public static async showDismissableInstructions(
        extensionUri: vscode.Uri,
        title: string,
        contentPath: string
    ): Promise<void> {
        return new Promise((resolve) => {
            const provider: InstructionsWebviewProvider =
                new InstructionsWebviewProvider(extensionUri);
            provider.showInstructionWebview(title, contentPath, [
                {
                    type: 'okButton',
                    action: (panel) => {
                        panel.dispose();
                        return resolve();
                    }
                }
            ]);
        });
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

    private validateMessageHanders(messageHandlers: WebviewMessageHandler[]) {
        const handlerMap: { [type: string]: boolean } = {};
        for (const handler of messageHandlers) {
            if (handlerMap[handler.type] === true) {
                throw new Error(
                    `There can be only one message handler per type. There are at least two handlers with type '${handler.type}'.`
                );
            } else {
                handlerMap[handler.type] = true;
            }
        }
    }
}
