/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export class UEMParser {
    public static findSObjects(json: Object): Array<string> {
        const sObjects = UEMParser.findObjectsWithValues(json, [
            'mcf/list',
            'mcf/timedList',
            'mcf/genericLists'
        ]);
        const results: string[] = [];

        sObjects.forEach((obj) => {
            let properties = obj['properties' as keyof Object];
            let objectApiName = properties[
                'objectApiName' as keyof Object
            ] as unknown as string;
            
            // Only include unique values in the array.
            if (!results.includes(objectApiName)) {
                results.push(objectApiName);
            }
        });

        return results;
    }

    static findObjectsWithValues(
        json: Object,
        valuesToMatch: string[]
    ): Array<Object> {
        const results: Array<Object> = [];

        if (typeof json === 'object') {
            if (Array.isArray(json)) {
                for (const item of json) {
                    results.push(
                        ...UEMParser.findObjectsWithValues(item, valuesToMatch)
                    );
                }
            } else {
                const values = Object.values(json);

                const matched = valuesToMatch.some((value) =>
                    values.includes(value)
                );

                if (matched) {
                    results.push(json);
                }

                for (const key in json) {
                    results.push(
                        ...UEMParser.findObjectsWithValues(
                            json[key as keyof Object],
                            valuesToMatch
                        )
                    );
                }
            }
        }

        return results;
    }
}
