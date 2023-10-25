/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { WebviewMessageHandler, WebviewProcessor } from './processor';

const INSTRUCTION_VIEW_TYPE = 'instructionsView';

export class InstructionsWebviewProvider {
    extensionUri: vscode.Uri;
    processor: WebviewProcessor;

    constructor(extensionUri: vscode.Uri, processor?: WebviewProcessor) {
        this.extensionUri = extensionUri;
        this.processor = processor ?? new WebviewProcessor(extensionUri);
    }

    public showInstructionWebview(
        title: string,
        contentPath: string,
        messageHandlers: WebviewMessageHandler[]
    ) {
        this.validateMessageHanders(messageHandlers);
        const panel = this.processor.createWebviewPanel(
            INSTRUCTION_VIEW_TYPE,
            title
        );

        panel.webview.onDidReceiveMessage((data) => {
            this.processor.onWebviewReceivedMessage(
                data,
                panel,
                messageHandlers
            );
        });

        const webviewContent = this.processor.getWebviewContent(
            panel,
            contentPath
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
