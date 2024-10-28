import { Diagnostic } from 'vscode-languageserver';

import { JSValidator } from './validator/jsValidator';
import { HTMLValidator } from './validator/htmlValidator';
import { GraphQLValidator } from './validator/gqlValidator';
import { DiagnosticSection } from './validator/baseValidator';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticSettings } from './diagnostic/DiagnosticSettings';
import { MisspelledUiapi } from './diagnostic/gql/misspelled-uiapi';
import { AdaptersLocalChangeNotAware } from './diagnostic/js/adapters-local-change-not-aware';
import { MobileOfflineFriendly } from './diagnostic/html/mobileOfflineFriendly';

import type { BaseValidator, SupportedType } from './validator/baseValidator';
export class ValidatorManager {
    private validators: BaseValidator<SupportedType>[] = [];

    private constructor() {}

    public addValidator(validator: BaseValidator<SupportedType>) {
        this.validators.push(validator);
    }

    async validateDocument(
        setting: DiagnosticSettings,
        document: TextDocument,
        extensionName: string
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
        const results = diagnosticArray.flat();
        results.forEach((diagnostic) => (diagnostic.source = extensionName));

        return results;
    }

    private async applyValidator(
        setting: DiagnosticSettings,
        document: TextDocument,
        validator: BaseValidator<SupportedType>
    ): Promise<Diagnostic[]> {
        //Parse document into Section with offsets
        const sections: DiagnosticSection<SupportedType>[] =
            validator.prepareDiagnosticTargets(document);

        const sectionDiagnostics = await Promise.all(
            sections.map(async (section) => {
                const { data, document, lineOffset, columnOffset } = section;
                try {
                    const diagnostics = await validator.validateData(
                        setting,
                        document,
                        data
                    );
                    // Update offset for final diagnostics
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
     * Update the graphql diagnostic offset to offset from the whole js file
     * @param diagnostic
     * @param lineOffset Line offset from the file
     * @param columnOffset Column offset from the file
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

    public static createInstance(): ValidatorManager {
        const validatorManager = new ValidatorManager();
        // Populate GraphQLValidator
        const gqlValidator = new GraphQLValidator();
        gqlValidator.addProducer(new MisspelledUiapi());
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
