import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    DocumentDiagnosticReportKind,
    CodeActionKind,
    type DocumentDiagnosticReport,
    CodeAction,
    WorkspaceChange,
    ChangeAnnotation,
    TextEdit,
    Position,
    SymbolInformation,
    SymbolKind,
    CodeLens
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
export let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
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
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['@']
            },
            diagnosticProvider: {
                interFileDependencies: false,
                workspaceDiagnostics: false
            },
            codeActionProvider: {
                codeActionKinds: [CodeActionKind.QuickFix],
                resolveProvider: true
            },
            hoverProvider: true,
            documentRangeFormattingProvider: {
                rangesSupport: true
            },
            documentFormattingProvider: true,
            documentHighlightProvider: true,
            documentOnTypeFormattingProvider: {
                firstTriggerCharacter: '}'
            },
            renameProvider: true,
            documentSymbolProvider: true,
            // colorProvider:true,
            foldingRangeProvider: true,
            codeLensProvider: {
                resolveProvider: true
            }
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
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The example settings
interface ExampleSettings {
    maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();
export const documentCache: Map<string, TextDocument> = new Map();

connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <ExampleSettings>(
            (change.settings.languageServerExample || defaultSettings)
        );
    }
    // Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
    // We could optimize things here and re-fetch the setting first can compare it
    // to the existing setting, but this is out of scope for this example.
    connection.languages.diagnostics.refresh();
});

export function getDocumentSettings(
    resource: string
): Thenable<ExampleSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'languageServerExample'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
    const uri = e.document.uri;
    documentSettings.delete(uri);
    documentCache.delete(uri);
});

connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (document !== undefined) {
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: []
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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    const document = change.document;
    documentCache.set(document.uri, document);
    //validateTextDocument(document);
});

connection.onDidChangeWatchedFiles((_change) => {
    // Monitored files have change in VSCode
    connection.console.log('We received a file change event');
});

// This handler provides the initial list of the completion items.

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
        item.detail = 'foo details';
        item.documentation = 'foo documentation';
    } else if (item.data === 2) {
        item.detail = 'bar details';
        item.documentation = 'bar documentation';
    }
    return item;
});

connection.onCodeActionResolve((codeAction) => {
    return codeAction;
});

// connection.onHover((params): Hover | undefined => {
//     return doOnHover(params);
// });

connection.onDocumentHighlight((textPosition) => {
    const position = textPosition.position;
    return [
        // DocumentHighlight.create({
        // 	start: { line: position.line + 1, character: position.character },
        // 	end: { line: position.line + 1, character: position.character + 5 }
        // }, DocumentHighlightKind.Text)
    ];
});

connection.onDocumentFormatting((params): TextEdit[] => {
    const result: TextEdit[] = [];

    const textDocument = documentCache.get(params.textDocument.uri)!;
    const text = textDocument.getText();

    const pattern = /gql`([^`]*)`/g;
    let match: RegExpExecArray | null;

    const change: WorkspaceChange = new WorkspaceChange();

    while ((match = pattern.exec(text)) && true) {
        const gqlText = match[1];
        const gqlBodyStartIndex = match.index + 4;
        const gqlBodyEndIndex = pattern.lastIndex - 1;

        // const rootQuery = RootQuery.parse(gqlText);
        // if (rootQuery.result != null) {
        //     const textEdit = TextEdit.replace(
        //         {
        //             start: textDocument.positionAt(gqlBodyStartIndex),
        //             end: textDocument.positionAt(gqlBodyEndIndex)
        //         },
        //         preTabLines(
        //             preTabLines(
        //                 preTabLines(`\n${rootQuery.result.toString()}\n`)
        //             )
        //         )
        //     );
        //     result.push(textEdit);
        // }
    }
    return result;
});

connection.onDocumentOnTypeFormatting((params) => {
    //	connection.console.log(`Document On Type Formatting: ${JSON.stringify(params.position)} ${params.ch} ${JSON.stringify(params.options)}`);
    return [];
});

connection.onRenameRequest((params) => {
    const td = documentCache.get(params.textDocument.uri);
    //	connection.console.log(`Rename: ${JSON.stringify(params.position)} ${params.newName}`);
    // return new ResponseError(20, 'Element can\'t be renamed');
    const change = new WorkspaceChange();
    change
        .getTextEditChange(params.textDocument.uri)
        .insert(
            Position.create(0, 0),
            'Rename inserted\n',
            ChangeAnnotation.create('Rename symbol', true)
        );
    return change.edit;
});

connection.onDocumentSymbol((identifier) => {
    return [
        SymbolInformation.create(
            'query',
            SymbolKind.Enum,
            {
                start: { line: 0, character: 15 },
                end: { line: 0, character: 22 }
            },
            identifier.textDocument.uri
        )
    ];
});

connection.onCodeLens((param) => {
    const result: CodeLens[] = [];
    return result;
});

connection.onCodeActionResolve((param) => {
    return CodeAction.create('abc', CodeActionKind.Empty);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
