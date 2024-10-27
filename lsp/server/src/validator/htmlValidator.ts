import { TextDocument } from 'vscode-languageserver-textdocument';
import { BaseValidator } from './baseValidator';

import { Section } from './baseValidator';
import { HTMLDocument, getLanguageService } from 'vscode-html-languageservice';
export class HTMLValidator extends BaseValidator<HTMLDocument> {
    prepareDataSections(textDocument: TextDocument): Section<HTMLDocument>[] {
        try {
            const data = getLanguageService().parseHTMLDocument(textDocument);

            return [
                {
                    data,
                    document: textDocument,
                    lineOffset: 0,
                    columnOffset: 0
                } satisfies Section<HTMLDocument>
            ];
        } catch (e) {
            console.log('Failed to parse HTML file.');
        }
        return [];
    }
    getLanguageId(): string {
        return 'html';
    }
}
