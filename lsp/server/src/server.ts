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
import { OrgUtils } from './utils/orgUtils';
import { WorkspaceUtils } from './utils/workspaceUtils';
import { getSettings } from './diagnostic/DiagnosticSettings';
import { validateTextDocument } from './validateMobileOffline';
import { validateMobileOffline } from './validateMobileOffline';
import { transformYamlToObject } from './utils/yamlParser';
import * as path from 'path';
import * as fs from 'fs';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Key used in yaml for list of base components
const baseComponentValues = 'values';

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
export let hasDiagnosticRelatedInformationCapability = false;

let extensionTitle = '';
let updateDiagnosticsSettingCommand = '';
let diagnosticsSettingSection = '';

// initialize default settings
let settings = getSettings({});
const documentCache: Map<string, TextDocument> = new Map();

// Primitive exports are not mutable across imports. Changes made directly to an exported object
// after the export won't be reflected in other modules. To allow changes to be reflected,
// an object, a deseralized YAML, is wrapped
export const baseComponentsAttributes = { values: {} };

connection.onInitialize((params: InitializeParams) => {
    const workspaceFolders = params.workspaceFolders;

    // Sets workspace folder to WorkspaceUtils
    WorkspaceUtils.setWorkSpaceFolders(workspaceFolders);
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

    const yamlPath = path.join(
        __dirname,
        'resources',
        'component-experiences.yaml'
    );

    const data = fs.readFileSync(yamlPath, 'utf-8');
    baseComponentsAttributes.values = transformYamlToObject(
        data,
        baseComponentValues
    );

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
    // Get the leaf object of diagnostic from change.
    // The diagnosticsSettingSection is 'mobileDiagnostics'
    // The change.settings is a json tree like blow
    // {
    //      mobileDiagnostics: {
    //          suppressAll: false,
    //          suppressByRuleId: []
    //      }
    // }
    const keys = diagnosticsSettingSection.split('.');
    const changedSetting = keys.reduce(
        (parent, key) => parent[key],
        change.settings
    );

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
            items: await validateDocument(document, extensionName)
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


documents.onDidChangeContent((change) => {
    const document = change.document;
    if (document.uri.endsWith('.html')) {
        validateMobileOffline(document);
    }
});


// Watch SF config file change
OrgUtils.watchConfig();
connection.onExit(function () {
    OrgUtils.unWatchConfig();
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
        const producerId = diagnostic.data as string;
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
