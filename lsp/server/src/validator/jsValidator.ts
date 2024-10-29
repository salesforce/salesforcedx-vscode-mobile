import { TextDocument } from 'vscode-languageserver-textdocument';
import { BaseValidator } from './baseValidator';
import type { Node } from '@babel/types';
import { parseJs } from '../utils/babelUtil';
import { DiagnosticSection } from './baseValidator';

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
            console.log('Failed to parse JavaScript file.');
        }
        return [];
    }

    getLanguageId(): string {
        return 'javascript';
    }
}
