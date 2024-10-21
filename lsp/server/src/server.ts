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
    CodeActionKind
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateDocument } from './validateDocument';
import { getSettings } from './diagnostic/DiagnosticSettings';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
export let hasDiagnosticRelatedInformationCapability = false;

let extensionTitle = '';
let updateDiagnosticsSettingCommand = '';
let diagnosticsSettingSection = '';

// initialize default settings
let settings = getSettings({});
const documentCache: Map<string, TextDocument> = new Map();

connection.onInitialize((params: InitializeParams) => {
    extensionTitle = params.initializationOptions?.extensionTitle;
    updateDiagnosticsSettingCommand =
        params.initializationOptions?.updateDiagnosticsSettingCommand;
    diagnosticsSettingSection =
        params.initializationOptions?.diagnosticsSettingSection;

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
            codeActionProvider: true
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
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, {
            section: diagnosticsSettingSection
        });
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

connection.onDidChangeConfiguration((change) => {
    const changedSetting = diagnosticsSettingSection
        .split('.')
        .reduce((parent, key) => parent[key], change.settings);

    if (hasConfigurationCapability) {
        settings = getSettings(changedSetting);
    }

    // Refresh the diagnostics since the diagnostic settings might have changed.
    connection.languages.diagnostics.refresh();
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    const document = change.document;
    documentCache.set(document.uri, document);
});

// Only keep cache for open documents
documents.onDidClose((e) => {
    const uri = e.document.uri;
    documentCache.delete(uri);
});

connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (document !== undefined) {
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: await validateDocument(settings, document, extensionTitle)
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

    diagnostics.forEach((diagnostic) => {
        // generate the two suppressing quick fixes
        const { data: producerId } = diagnostic;
        const suppressByRuleId = new Set(settings.suppressByRuleId);
        suppressByRuleId.add(producerId);
        const suppressThisDiagnostic: CodeAction = {
            title: `Suppress such diagnostic: ${producerId}`,
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            command: {
                title: 'Update workspace setting',
                command: updateDiagnosticsSettingCommand,
                arguments: [
                    {
                        suppressByRuleId: Array.from(suppressByRuleId)
                    }
                ]
            }
        };
        result.push(suppressThisDiagnostic);

        const suppressAllDiagnostic: CodeAction = {
            title: 'Suppress all Salesforce Mobile diagnostics',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            command: {
                title: 'Update workspace setting',
                command: updateDiagnosticsSettingCommand,
                arguments: [
                    {
                        suppressAll: true
                    }
                ]
            }
        };
        result.push(suppressAllDiagnostic);
    });

    return result;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
