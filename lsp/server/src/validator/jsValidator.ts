import { TextDocument } from 'vscode-languageserver-textdocument';
import { BaseValidator, DiagnosticSection } from './baseValidator';
import type { Node } from '@babel/types';
import { parseJs } from '../utils/babelUtil';

export class JSValidator extends BaseValidator<Node> {
    gatherDiagnosticSections(
        textDocument: TextDocument
    ): DiagnosticSection<Node>[] {
        try {
            const data = parseJs(textDocument.getText());
            //One DiagnosticSection with lineOffset and columnOffset as 0
            return [
                {
                    data,
                    document: textDocument,
                    lineOffset: 0,
                    columnOffset: 0
                } satisfies DiagnosticSection<Node>
            ];
        } catch (e) {
            console.log(
                `Failed to parse JavaScript file: : ${(e as Error).message}`
            );
        }
        return [];
    }

    getLanguageId(): string {
        return 'javascript';
    }
}
