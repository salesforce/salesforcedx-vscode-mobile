/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { l10n } from 'vscode';
import { Field } from './orgUtils';

export class UEMParser {

    public static findFieldValues(json: Object, targetField: String): string[] {
        const results:string[] = [];
      
        function search(json: any) {
          for (const key in json) {
            if (json.hasOwnProperty(key)) {
              if (key === targetField) {
                // Only include unique values in the array.
                if (!results.includes(json[key])) {
                    results.push(json[key]);
                }
              } else if (typeof json[key] === 'object') {
                search(json[key]);
              }
            }
          }
        }
      
        search(json);
        return results;
    }
}
