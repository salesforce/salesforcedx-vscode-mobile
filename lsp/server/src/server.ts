/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    DocumentDiagnosticReportKind,
    type DocumentDiagnosticReport,
    CodeAction,
    CodeActionKind,
    WorkspaceChange,
} from 'vscode-languageserver/node';


import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateDocument } from './validateDocument';
import { globalSettings, Settings, getSettings} from './settings';
import { DiagnosticMetaData } from './diagnostic/DiagnosticProducer';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
export let hasDiagnosticRelatedInformationCapability = false;

let extensionName: string = '';
let workspaceFolder: string | null | undefined;

const documentCache: Map<string, TextDocument> = new Map;

connection.onInitialize((params: InitializeParams) => {
    extensionName = params.initializationOptions?.extensionName;
    workspaceFolder = params.workspaceFolders && params.workspaceFolders[0].uri;
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            diagnosticProvider: {
                interFileDependencies: false,
                workspaceDiagnostics: false
            },
            codeActionProvider: true,
        }
    };

    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }

    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for configuration change at 'mobile.lsp' section.
        connection.client.register(
            DidChangeConfigurationNotification.type, { section: 'mobile.lsp' }
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// Cache the settings
let settings: Settings = globalSettings

connection.onDidChangeConfiguration((change) => {
    settings = hasConfigurationCapability? getSettings(change.settings['mobile']['lsp']): globalSettings;

    // Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
    // We could optimize things here and re-fetch the setting first can compare it
    // to the existing setting, but this is out of scope for this example.
    connection.languages.diagnostics.refresh();
});

connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (document !== undefined) {
        return {
            kind: DocumentDiagnosticReportKind.Full,
            // items: await validateDocument(settings.diagnostic, document, extensionName)
            items: await validateDocument(settings.diagnostic, document, extensionName)
        } satisfies DocumentDiagnosticReport;
    } else {
        // We don't know the document. We can either try to read it from disk
        // or we don't report problems for it.
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: []
        } satisfies DocumentDiagnosticReport;
    }
});

connection.onCodeAction((params) => {
    const textDocument = documentCache.get(params.textDocument.uri);
    const diagnostics = params.context.diagnostics;
	if (textDocument === undefined || diagnostics.length === 0) {
		return undefined;
	}
    
	const result: CodeAction[] = [];
    diagnostics.forEach((item) => {
        const { data } = item;
        if (data !== undefined) {
            const metData = data as DiagnosticMetaData;
            if (metData.id !== undefined) {

                // const suppressThisDiagnostic: CodeAction = {
                //     title: 'Suppress this diagnostic', 
                //     kind: CodeActionKind.QuickFix,
                //     diagnostics: [item],

                // };
                // result.push(suppressThisDiagnostic);

                    const suppressAllDiagnostic: CodeAction = {
                        title: 'Suppress All Salesforce Mobile diagnostic', 
                        kind: CodeActionKind.QuickFix,
                        diagnostics: [item],
                        command: {
                            title: 'Update workspace setting',
                            command: 'salesforce.salesforcedx-vscode-mobile.lsp.updateDiagnosticsSetting',
                            arguments: [{
                                'suppress.all': true
                            }]
                        }
                    };
                    result.push(suppressAllDiagnostic);
                
            }
        }
    });


    return result;
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	const document = change.document;
	documentCache.set(document.uri, document);
});

// Only keep cache for open documents
documents.onDidClose(e => {
	const uri = e.document.uri;
	documentCache.delete(uri);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
