import {
    HTMLDocument,
    getLanguageService
} from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic } from 'vscode-languageserver/node';
import { DiagnosticProducer } from './diagnostic/DiagnosticProducer';
import { DiagnosticSettings, isTheDiagnosticSuppressed } from './diagnostic/DiagnosticSettings';
import { MobileOfflineFriendly } from './diagnostic/html/mobileOfflineFriendly';

const diagnosticProducers: DiagnosticProducer<HTMLDocument>[] = [
    new MobileOfflineFriendly()
];

function parseHTMLContent(content: TextDocument): HTMLDocument {
    const htmlLanguageService = getLanguageService();
    return htmlLanguageService.parseHTMLDocument(content);
}

export async function validateHtml(setting: DiagnosticSettings, textDocument: TextDocument): Promise<Diagnostic[]> {
    let results: Diagnostic[] = [];
    
    const producers = diagnosticProducers.filter((producer) => {
        return !isTheDiagnosticSuppressed(setting, producer.getId())
    });
    
    if (producers.length > 0) {
        try {
            const htmlDocument = parseHTMLContent(textDocument);
            
            for (const producer of diagnosticProducers) {
                const producerId = producer.getId()
                const diagnostics = await producer.validateDocument(
                    textDocument,
                    htmlDocument
                );
                diagnostics.forEach((diagnostic) => {
                    diagnostic.data = producerId;
                });
                results = results.concat(diagnostics);
            }
        } catch (e) {}
    }
    return results;
}
