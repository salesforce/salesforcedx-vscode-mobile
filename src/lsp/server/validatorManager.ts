import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { JSValidator } from './validators/jsValidator';
import { HTMLValidator } from './validators/htmlValidator';
import { GraphQLValidator } from './validators/gqlValidator';
import { DiagnosticSection } from './validators/baseValidator';
import type { BaseValidator, SupportedType } from './validators/baseValidator';

import { DiagnosticSettings } from './diagnostics/DiagnosticSettings';
import { OversizedRecord } from './diagnostics/gql/over-sized-record';
import { AdaptersLocalChangeNotAware } from './diagnostics/js/adapters-local-change-not-aware';
import { MobileOfflineFriendly } from './diagnostics/html/mobileOfflineFriendly';

/**
 * The ValidatorManager class manages a collection of BaseValidator instances and coordinates the validation process for documents.
 * It filters relevant validators based on the document's language, applies each to designated sections of the document, and aggregates diagnostics
 * for consistent, language-specific validation. This class centralizes validation logic, enabling efficient, extensible diagnostic processing
 * across multiple validators.
 */
export class ValidatorManager {
    // Store all available validators
    private validators: BaseValidator<SupportedType>[] = [];

    private constructor() {}

    /**
     * Adds a validator to the manager’s collection.
     * @param validator The validator to be added.
     */
    public addValidator(validator: BaseValidator<SupportedType>) {
        this.validators.push(validator);
    }

    /**
     * Validate a document by applying all relevant validators based on language.
     * @param setting The diagnostic settings.
     * @param document The document to validate.
     * @returns A promise resolving to an array of diagnostics.
     */
    async validateDocument(
        setting: DiagnosticSettings,
        document: TextDocument
    ): Promise<Diagnostic[]> {
        const qualifiers = this.validators.filter(
            (validator) => validator.getLanguageId() === document.languageId
        );
        const diagnosticArray = await Promise.all(
            qualifiers.map(async (validator) => {
                try {
                    return await this.applyValidator(
                        setting,
                        document,
                        validator
                    );
                } catch (e) {}
                return [];
            })
        );
        return diagnosticArray.flat();
    }

    /**
     * Apply a specific validator to designated sections within the document.
     * @param setting The diagnostic settings.
     * @param document The document to validate.
     * @param validator The validator to apply.
     * @returns A promise resolving to an array of diagnostics from the validator.
     */
    private async applyValidator(
        setting: DiagnosticSettings,
        document: TextDocument,
        validator: BaseValidator<SupportedType>
    ): Promise<Diagnostic[]> {
        // Gather sections of the document relevant to diagnostics
        const sections: DiagnosticSection<SupportedType>[] =
            validator.gatherDiagnosticSections(document);

        // Validate each section and apply line and column offsets to diagnostics
        const sectionDiagnostics = await Promise.all(
            sections.map(async (section) => {
                const { data, document, lineOffset, columnOffset } = section;
                try {
                    const diagnostics = await validator.validateData(
                        setting,
                        document,
                        data
                    );
                    // Adjust diagnostics with section-specific offsets
                    for (const diagnostic of diagnostics) {
                        this.updateDiagnosticOffset(
                            diagnostic,
                            lineOffset,
                            columnOffset
                        );
                    }
                    return diagnostics;
                } catch (e) {}
                return [];
            })
        );

        return sectionDiagnostics.flat();
    }

    /**
     * Update the line and column positions of a diagnostic based on section offsets.
     * @param diagnostic The diagnostic to adjust.
     * @param lineOffset The line offset to apply.
     * @param columnOffset The column offset to apply.
     */
    private updateDiagnosticOffset(
        diagnostic: Diagnostic,
        lineOffset: number,
        columnOffset: number
    ) {
        const start = diagnostic.range.start;
        const end = diagnostic.range.end;

        // Only add the column offset for first line.
        if (start.line === 0) {
            start.character += columnOffset;
        }
        if (end.line === 0) {
            end.character += columnOffset;
        }

        start.line += lineOffset;
        end.line += lineOffset;
    }

    /**
     * The createInstance method is a static factory method that creates and returns an instance of ValidatorManager with pre-configured validators.
     * It initializes ValidatorManager, then adds instances of GraphQLValidator, JSValidator, and HTMLValidator to it. Each validator is configured
     * with relevant diagnostic producers.
     * @returns ValidatorManager instance
     */
    public static createInstance(): ValidatorManager {
        const validatorManager = new ValidatorManager();
        // Populate GraphQLValidator
        const gqlValidator = new GraphQLValidator();
        gqlValidator.addProducer(new OversizedRecord());
        validatorManager.addValidator(gqlValidator);

        const jsValidator = new JSValidator();
        jsValidator.addProducer(new AdaptersLocalChangeNotAware());
        validatorManager.addValidator(jsValidator);

        const htmlValidator = new HTMLValidator();
        htmlValidator.addProducer(new MobileOfflineFriendly());
        validatorManager.addValidator(htmlValidator);

        return validatorManager;
    }
}
