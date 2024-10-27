import { TextDocument } from 'vscode-languageserver-textdocument';
import { BaseValidator } from './baseValidator';
import type { Node } from '@babel/types';
import { parseJs } from '../utils/babelUtil';
import { Section } from './baseValidator';

export class JSValidator extends BaseValidator<Node> {
    prepareDataSections(textDocument: TextDocument): Section<Node>[] {
        try {
            const data = parseJs(textDocument.getText());
            return [
                {
                    data,
                    document: textDocument,
                    lineOffset: 0,
                    columnOffset: 0
                } satisfies Section<Node>
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
