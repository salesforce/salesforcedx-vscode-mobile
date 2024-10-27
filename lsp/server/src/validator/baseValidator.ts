import { TextDocument } from 'vscode-languageserver-textdocument';
{
}
import { DiagnosticProducer } from '../diagnostic/DiagnosticProducer';
import {
    DiagnosticSettings,
    isTheDiagnosticSuppressed
} from '../diagnostic/DiagnosticSettings';
import { Diagnostic } from 'vscode-languageserver';
import type { Node } from '@babel/types';
import type { ASTNode } from 'graphql';
import type { HTMLDocument } from 'vscode-html-languageservice';

export type SupportedType = Node | ASTNode | HTMLDocument;

export interface Section<SupportedType> {
    data: SupportedType;
    document: TextDocument;
    lineOffset: number;
    columnOffset: number;
}
export abstract class BaseValidator<SupportedType> {
    private producers: Array<DiagnosticProducer<SupportedType>>;

    constructor() {
        this.producers = [];
    }

    public addProducer(producer: DiagnosticProducer<SupportedType>) {
        if (
            !this.producers.some((existingProducer) => {
                producer.getId === existingProducer.getId;
            })
        ) {
            this.producers.push(producer);
        }
    }

    public removeProducer(producer: DiagnosticProducer<SupportedType>) {}

    abstract prepareDataSections(
        textDocument: TextDocument
    ): Array<Section<SupportedType>>;

    async validateData(
        setting: DiagnosticSettings,
        textDocument: TextDocument,
        data: SupportedType
    ): Promise<Array<Diagnostic>> {
        const activeProducers = this.producers.filter((producer) => {
            return !isTheDiagnosticSuppressed(setting, producer.getId());
        });

        if (activeProducers.length === 0) {
            return [];
        }

        const diagnosticsArray = await Promise.all(
            activeProducers.map(async (producer) => {
                try {
                    return await producer.validateDocument(textDocument, data);
                } catch (e) {
                    console.log(
                        `Cannot diagnose document with rule ID ${producer.getId()}`
                    );
                }
                return [];
            })
        );
        return diagnosticsArray.flat();
    }

    abstract getLanguageId(): string;
}
