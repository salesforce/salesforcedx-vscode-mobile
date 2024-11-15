import { TextDocument } from 'vscode-languageserver-textdocument';
import { BaseValidator, DiagnosticSection } from './baseValidator';
import { HTMLDocument, getLanguageService } from 'vscode-html-languageservice';

export class HTMLValidator extends BaseValidator<HTMLDocument> {
    gatherDiagnosticSections(
        textDocument: TextDocument
    ): DiagnosticSection<HTMLDocument>[] {
        try {
            const data = getLanguageService().parseHTMLDocument(textDocument);

            return [
                {
                    data,
                    document: textDocument,
                    lineOffset: 0,
                    columnOffset: 0
                } satisfies DiagnosticSection<HTMLDocument>
            ];
        } catch (e) {
            console.log(`Failed to parse HTML file: : ${(e as Error).message}`);
        }
        return [];
    }
    getLanguageId(): string {
        return 'html';
    }
}
