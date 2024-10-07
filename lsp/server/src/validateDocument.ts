/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Diagnostic } from "vscode";
import { TextDocument } from "vscode-languageserver-textdocument";


/**
 * process the document based extension type.
 * if html, call html related rules; 
 * if js then parse it using babel, call js related rules
 * find the gql taggedTemplates, parse the graphql string and call graphql related rules. 
 * @param document the input document to validate.
 */
export async function validateDocument(document: TextDocument): Promise<Diagnostic[]> {

}
