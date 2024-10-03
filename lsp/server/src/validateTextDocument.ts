import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import {
    getDocumentSettings,
    hasDiagnosticRelatedInformationCapability
} from './server';
//import { RootQuery } from './graphql/rootQuery';

/**
 *
 * @param textDocument
 * @returns
 */
export async function validateTextDocument(
    textDocument: TextDocument
): Promise<Diagnostic[]> {
    const settings = await getDocumentSettings(textDocument.uri);

    // The validator creates diagnostics for all uppercase words length 2 and more5
    const text = textDocument.getText();
    const pattern = /gql`([^`]*)`/g;
    let match: RegExpExecArray | null;

    let problems = 0;
    const diagnostics: Diagnostic[] = [];
    while (
        (match = pattern.exec(text)) &&
        problems < settings.maxNumberOfProblems
    ) {
        problems++;

        const gqlText = match[1];
        const gqlBodyStartIndex = match.index + 3;
        const gqlBodyEndIndex = pattern.lastIndex;

        // const rootQuery = RootQuery.parse(gqlText);

        // if (rootQuery.error !== undefined) {
        //     let range: Range = {
        //         start: textDocument.positionAt(gqlBodyStartIndex),
        //         end: textDocument.positionAt(gqlBodyEndIndex)
        //     };

        //     if (rootQuery.errorRegExp !== undefined) {
        //         const errorMatch = rootQuery.errorRegExp.exec(gqlText);
        //         if (errorMatch !== null) {
        //             range = {
        //                 start: textDocument.positionAt(
        //                     gqlBodyStartIndex + errorMatch.index + 1
        //                 ),
        //                 end: textDocument.positionAt(
        //                     gqlBodyStartIndex +
        //                         errorMatch.index +
        //                         errorMatch[0].length
        //                 )
        //             };
        //         }
        //     }

        //     const diagnostic: Diagnostic = {
        //         severity: DiagnosticSeverity.Error,
        //         range,
        //         message: rootQuery.error.message
        //         // source: 'sf graphql vscode lsp',
        //     };
        //     if (hasDiagnosticRelatedInformationCapability) {
        //         // diagnostic.relatedInformation = [
        //         // 	{
        //         // 		location: {
        //         // 			uri: textDocument.uri,
        //         // 			range: Object.assign({}, diagnostic.range)
        //         // 		},
        //         // 		message: 'first related info'
        //         // 	},
        //         // 	{
        //         // 		location: {
        //         // 			uri: textDocument.uri,
        //         // 			range: Object.assign({}, diagnostic.range)
        //         // 		},
        //         // 		message: 'second related info'
        //         // 	}
        //         // ];
        //     }
        //     diagnostics.push(diagnostic);
        // } else if (rootQuery.result !== undefined) {
        //     const warning = getPerfWarning(rootQuery.result);
        //     if (warning !== undefined) {
        //         const diagnostic: Diagnostic = {
        //             severity: DiagnosticSeverity.Warning,
        //             range: {
        //                 start: textDocument.positionAt(gqlBodyStartIndex),
        //                 end: textDocument.positionAt(gqlBodyEndIndex)
        //             },
        //             message: warning.message
        //         };
        //         diagnostics.push(diagnostic);
        //     } else {
        //         const message = getInfo(rootQuery.result);
        //         if (message !== undefined) {
        //             const diagnostic: Diagnostic = {
        //                 severity: DiagnosticSeverity.Warning,
        //                 range: {
        //                     start: textDocument.positionAt(
        //                         gqlBodyStartIndex - 3
        //                     ),
        //                     end: textDocument.positionAt(gqlBodyStartIndex)
        //                 },
        //                 message
        //             };
        //             diagnostics.push(diagnostic);
        //         }
        //     }
        // }
    }
    return diagnostics;
}

// function getPerfWarning(rootQuery: RootQuery): Error | undefined {
//     const fieldCount =
//         rootQuery.uiapi?.query?.recordQuery?.edges?.node?.fields.length;
//     if (fieldCount !== undefined && fieldCount > 20) {
//         return new Error(
//             `query is retrieving ${fieldCount} fields, above suggested threshold of 20, the graphql could run slow.`
//         );
//     }
//     return undefined;
// }

// function getInfo(rootQuery: RootQuery): string | undefined {
//     const apiName = rootQuery.uiapi?.query?.recordQuery?.apiName;
//     const fieldCount =
//         rootQuery.uiapi?.query?.recordQuery?.edges?.node?.fields.length;
//     if (apiName !== undefined && fieldCount !== undefined) {
//         return `querying ${apiName} with ${fieldCount} fields`;
//     }
//     return undefined;
// }
