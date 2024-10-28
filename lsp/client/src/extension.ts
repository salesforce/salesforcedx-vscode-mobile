/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(
    context: ExtensionContext,
    updateDiagnosticsSettingCommand: string,
    diagnosticsSettingSection: string
) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(
        path.join('lsp/server', 'out', 'server.js')
    );

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc
        }
    };

    // Get extension name
    const extensionTitle =
        context.extension.packageJSON.contributes.configuration.title;

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            // Watch all js and html files, to be fine-tuned to watch for files in LWC bundle.
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'html' }
        ],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/.sf/config.json')
        },
        initializationOptions: {
            extensionTitle,
            updateDiagnosticsSettingCommand,
            diagnosticsSettingSection
        }
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'LSP Mobile',
        'LSP Mobile Client',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
