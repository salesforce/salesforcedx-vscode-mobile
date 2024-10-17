import {
    Node,
    HTMLDocument,
    getLanguageService
} from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { transformYamlToObject } from './utils/yamlParser';
import * as path from 'path';
import * as fs from 'fs';

const baseComponentsAttributes = { values: getBaseComponentsAttributes() };

function getBaseComponentsAttributes(): Record<string, string[]> {
    const yamlPath = path.join(
        __dirname,
        'resources',
        'component-experiences.yaml'
    );

    let values: Record<string, string[]> = {};

    try {
        const data = fs.readFileSync(yamlPath, 'utf-8');
        values = transformYamlToObject(data, 'values');
    } catch (error) {
        // YAML parsing may fail. In that case log the error but don't bring
        // down LSP with it.
        console.error(error); 
    }

    return values;
}

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

function camelToKebabCase(str: string): string {
    return (
        str
            // Replace uppercase letters with a dash followed by the lowercase letter
            .replace(/([A-Z])/g, '-$1')
            // Convert the entire string to lowercase
            .toLowerCase()
    );
}

/**
 * Parse componenent-experiences.yaml come in a format like this
 *
 * ```
 * {
 *   ...
 *   'lightning:accordion': ['MobileOffline', 'Lightning', 'Communities'],
 *   'lightning:fileUpload': ['Lightning', 'Communities'],
 *   ...
 * }
 * ```
 *
 * This function gets array of converted keys(aka, names of base components how they are used in html),
 * from camel case to kebob case, that doesn't have a specific string in it's array of values.
 *
 * @param obj Parsed component-experiences.yaml in a JSON format
 * @param searchString A string that should not be in the key's values.
 * @returns An array of base component names, as used in html, without a certain attribute.
 */
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
            // Base component uses '-' isntead of ':'.
            // 'lightning' is the namespace.
            const splittedKeys = key.split(':');

            // Base component names appear as camel case in yamel. In html template,
            // base component names use kebob case. So convert the name. For example,
            // 'fileUpload' needs to be converted to 'file-upload'.
            const baseComponentNameKebob = camelToKebabCase(splittedKeys[1]);

            // Concatenate the namespace and component name with a dash in the middle.
            const fixedKey = `${splittedKeys[0]}-${baseComponentNameKebob}`;

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
    const diagnostics: Diagnostic[] = [];

    try {
        const htmlDocument = parseHTMLContent(content);
        const customTags = findTags(htmlDocument, nonOfflinebaseComponents);
        for (const tag of customTags) {
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: textDocument.positionAt(tag.start),
                    end: textDocument.positionAt(tag.end)
                },
                message: `<${tag.tag}> is not a mobile offline friendly LWC base component.`
            };
            diagnostics.push(diagnostic);
        }
    } catch(error) {
        // HTML parsing may fail. In that case log the error but don't bring
        // down LSP with it.
        console.error(error); 
    }

    return diagnostics;
}
