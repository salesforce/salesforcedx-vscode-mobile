/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export class UEMParser {
    public static findSObjects(json: Object): Array<string> {
        const sObjects = UEMParser.findObjectsWithKey(json, 'objectApiName');

        return sObjects;
    }

    static findObjectsWithKey(
        nestedJsonBlock: any,
        keyToMatch: string
    ): Array<string> {
        const results: Array<any> = [];

        if (typeof nestedJsonBlock === 'object') {
            const keys = Object.keys(nestedJsonBlock);

            for (const key in nestedJsonBlock) {
                const value = nestedJsonBlock[key];
                if (key === keyToMatch && typeof value === 'string') {
                    results.push(nestedJsonBlock[key as keyof Object]);
                } else {
                    results.push(
                        ...UEMParser.findObjectsWithKey(
                            nestedJsonBlock[key as keyof Object],
                            keyToMatch
                        )
                    );
                }
            }
        } else if (Array.isArray(nestedJsonBlock)) {
            const nestedArrayBlock = nestedJsonBlock as Array<any>;
            for (const item of nestedArrayBlock) {
                results.push(...UEMParser.findObjectsWithKey(item, keyToMatch));
            }
        }

        // Clean the array to return. Remove duplicate values.
        return [...new Set(results)];
    }
}
