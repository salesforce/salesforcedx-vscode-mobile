/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { existsSync, readFileSync } from 'node:fs';
import { Uri, ViewColumn, WebviewPanel, env, window } from 'vscode';

export const MESSAGING_JS_PATH = 'resources/instructions/webviewMessaging.js';
export const MESSAGING_SCRIPT_PATH_DEMARCATOR = '--- MESSAGING_SCRIPT_SRC ---';

export type WebviewMessageCallback = (responseData?: object) => void;

export type WebviewMessageHandler = {
    type: string;
    action: (
        panel: WebviewPanel,
        data?: object,
        callback?: WebviewMessageCallback
    ) => void;
};

export class WebviewProcessor {
    extensionUri: Uri;

    constructor(extensionUri: Uri) {
        this.extensionUri = extensionUri;
    }

    public createWebviewPanel(viewType: string, title: string): WebviewPanel {
        const panel = window.createWebviewPanel(
            viewType,
            title,
            ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [this.extensionUri]
            }
        );
        return panel;
    }

    public onWebviewReceivedMessage(
        data: any,
        panel: WebviewPanel,
        messageHandlers: WebviewMessageHandler[]
    ) {
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
    }

    public getWebviewContent(panel: WebviewPanel, contentPath: string): string {
        const localeContentPath = this.getLocaleContentPath(contentPath);
        const htmlPath = Uri.joinPath(this.extensionUri, localeContentPath);
        const messagingJsPath = Uri.joinPath(
            this.extensionUri,
            MESSAGING_JS_PATH
        );

        let webviewContent = readFileSync(htmlPath.fsPath, {
            encoding: 'utf-8'
        });
        webviewContent = webviewContent.replace(
            MESSAGING_SCRIPT_PATH_DEMARCATOR,
            panel.webview.asWebviewUri(messagingJsPath).toString()
        );
        return webviewContent;
    }

    /**
     * Check to see if a locale-specific file exists, otherwise return the default.
     * @param contentPath The relative path (and filename) of the content to display.
     */
    public getLocaleContentPath(contentPath: string): string {
        const language = env.language;

        // check to see if a file exists for this locale.
        const localeContentPath = contentPath.replace(
            /\.html$/,
            `.${language}.html`
        );

        const fullPath = Uri.joinPath(this.extensionUri, localeContentPath);

        if (existsSync(fullPath.fsPath)) {
            // a file exists for this locale, so return it instead.
            return localeContentPath;
        } else {
            // fall back
            return contentPath;
        }
    }
}
