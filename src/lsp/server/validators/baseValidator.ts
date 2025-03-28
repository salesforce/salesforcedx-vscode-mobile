import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticProducer } from '../diagnostics/DiagnosticProducer';
import {
    DiagnosticSettings,
    isTheDiagnosticSuppressed
} from '../diagnostics/DiagnosticSettings';
import { Diagnostic } from 'vscode-languageserver';
import type { Node } from '@babel/types';
import type { ASTNode } from 'graphql';
import type { HTMLDocument } from 'vscode-html-languageservice';

export type SupportedType = Node | ASTNode | HTMLDocument;

/**
 * The DiagnosticSection interface represents a distinct segment of a document that a DiagnosticProducer can process independently.
 * Each data field corresponds to a specific part of the document, with lineOffset and columnOffset indicating the section’s relative position
 * within the entire document. This allows diagnostic producers to process specific portions effectively.
 */
export interface DiagnosticSection<SupportedType> {
    data: SupportedType;
    document: TextDocument;
    lineOffset: number;
    columnOffset: number;
}
/**
 * The `BaseValidator` class is an abstract foundation for managing `DiagnosticProducer` instances that generate diagnostics.
 * It enables adding/removing producers, gathering diagnostic sections (via `gatherDiagnosticSections`), validating data, and
 * specifying a language ID. This structure supports extensible, language-specific validation across data types.
 */
export abstract class BaseValidator<SupportedType> {
    private producers: Array<DiagnosticProducer<SupportedType>>;

    constructor() {
        this.producers = [];
    }

    /**
     * Add a diagnostic producer to the list if it isn't already present.
     * @param producer The diagnostic producer to be added.
     */
    public addProducer(producer: DiagnosticProducer<SupportedType>) {
        if (
            !this.producers.some((existingProducer) => {
                producer.getId === existingProducer.getId;
            })
        ) {
            this.producers.push(producer);
        }
    }

    /**
     * Remove a diagnostic producer from the list.
     * @param producerId The Id of diagnostic producer to be removed.
     */
    public removeProducer(producerId: string) {
        this.producers = this.producers.filter(
            (producer) => producer.getId() !== producerId
        );
    }

    /**
     * Prepare diagnostic sections for each producer to process.
     * @param textDocument The document to analyze.
     * @returns An array of diagnostic sections relevant to the producers.
     */
    abstract gatherDiagnosticSections(
        textDocument: TextDocument
    ): Array<DiagnosticSection<SupportedType>>;

    /**
     * Validate data against active diagnostic producers and generates diagnostics.
     * @param setting The diagnostic settings.
     * @param textDocument The document to analyze.
     * @param data The data to validate.
     * @returns An array of diagnostics generated by active producers.
     */
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
                    const producerId = producer.getId();
                    const docUrl = producer.getDocUrl();
                    const diagnostics = await producer.validateDocument(
                        textDocument,
                        data
                    );
                    diagnostics.forEach((diagnostic) => {
                        diagnostic.data = producerId;
                        // Show id as link label and docUrl as link href
                        diagnostic.code = producerId;
                        if (docUrl !== undefined) {
                            diagnostic.codeDescription = {
                                href: docUrl
                            };
                        }
                    });
                    return diagnostics;
                } catch (e) {
                    console.log(
                        `Cannot diagnose document with rule ID ${producer.getId()}: ${(e as Error).message}`
                    );
                }
                return [];
            })
        );
        return diagnosticsArray.flat();
    }

    /**
     * Language Id this validator handles
     */
    abstract getLanguageId(): string;
}
