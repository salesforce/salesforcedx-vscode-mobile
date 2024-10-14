import { Node, HTMLDocument, getLanguageService } from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { baseComponentsAttributes } from './server';

function parseHTMLContent(content: string): HTMLDocument {
    const document = TextDocument.create(
        'file:///test.html',
        'html',
        0,
        content
    );
    const htmlLanguageService = getLanguageService();
    return htmlLanguageService.parseHTMLDocument(document);
}

function traverse(node: Node, tagNames: string[], tags: Node[]): void {
    if (node.tag && tagNames.includes(node.tag)) {
        tags.push(node);
    }

    node.children.forEach((childNode) => traverse(childNode, tagNames, tags));
}

function findTags(document: HTMLDocument, tagNames: string[]): Node[] {
    const tags: Node[] = [];
    const rootNode = document.roots[0];

    if (rootNode) {
        traverse(rootNode, tagNames, tags);
    }

    return tags;
}

function getKeysWithoutSpecificValue(
    obj: Record<string, string[]>,
    searchString: string
): string[] {
    const result: string[] = [];

    for (const [key, valueArray] of Object.entries(obj)) {
        // Check only for LWC. They are prefixed with 'lightning:'.
        if (
            key.startsWith('lightning:') &&
            !valueArray.includes(searchString)
        ) {
            // In LWC template(html), tags use - instead of :
            const fixedKey = key.replace(':', '-');
            result.push(fixedKey);
        }
    }

    return result;
}

export async function validateMobileOffline(
    textDocument: TextDocument
): Promise<Diagnostic[]> {
    const nonOfflinebaseComponents = getKeysWithoutSpecificValue(
        baseComponentsAttributes.values,
        'MobileOffline'
    );
    const content = textDocument.getText();
    const htmlDocument = parseHTMLContent(content);
    const customTags = findTags(htmlDocument, nonOfflinebaseComponents);
    const diagnostics: Diagnostic[] = [];

    for (const tag of customTags) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(tag.start),
                end: textDocument.positionAt(tag.end)
            },
            message: `<${tag.tag}> is not a mobile offline friendly LWC.`,
            source: 'Salesforce VSCode Mobile DX LSP'
        };
        diagnostics.push(diagnostic);
    }

    return diagnostics;
}
