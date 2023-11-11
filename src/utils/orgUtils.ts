/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ConfigAggregator, Org, OrgConfigProperties } from '@salesforce/core';

export interface SObject {
    apiName: string;
    label: string;
    labelPlural: string;
}

export interface Field {
    apiName: string;
    label: string;
    type: string;
}

export interface CompactLayoutField {
    editableForNew: boolean;
    editableForUpdate: boolean;
    label: string;
}

export class OrgUtils {
    public static async getSobjects(): Promise<SObject[]> {
        try {
            const org = await Org.create();
            const conn = org.getConnection();
            const result = await conn.describeGlobal();

            const sobjects = result.sobjects
                .map((sobject) => {
                    const so: SObject = {
                        apiName: sobject.name,
                        label: sobject.label,
                        labelPlural: sobject.labelPlural
                    };
                    return so;
                })
                .sort((a, b) => a.apiName.localeCompare(b.apiName));
            return Promise.resolve(sobjects);
        } catch (error) {
            console.log(error);
            return Promise.reject(error);
        }
    }

    public static async getFieldsForSObject(apiName: string): Promise<Field[]> {
        try {
            const org = await Org.create();
            const conn = org.getConnection();
            const result = await conn.describe(apiName);

            const fields = result.fields
                .map((field) => {
                    const f: Field = {
                        apiName: field.name,
                        label: field.label,
                        type: field.type
                    };
                    return f;
                })
                .sort((a, b) => a.apiName.localeCompare(b.apiName));
            return Promise.resolve(fields);
        } catch (error) {
            console.log(error);
            return Promise.reject(error);
        }
    }

    public static async getCompactLayoutFieldsForSObject(
        sObjectName: string
    ): Promise<CompactLayoutField[]> {
        try {
            const org = await Org.create();
            const conn = org.getConnection();

            // Get the compact layout info for a sObject first
            let result = await conn.request(
                `/services/data/v59.0/sobjects/${sObjectName}/describe/compactLayouts`
            );

            const fields: CompactLayoutField[] = [];

            if (result) {
                const resultObj = result as Object;

                // sObject can have multiple compact layouts associated with it. Get the default.
                const defaultCompactLayoutId =
                    resultObj['defaultCompactLayoutId' as keyof Object];
                const recordTypeCompactLayoutMappings =
                    resultObj[
                        'recordTypeCompactLayoutMappings' as keyof Object
                    ];

                // ID of compact layout need to be normalized
                const recordTypeCompactLayoutMapping = (
                    recordTypeCompactLayoutMappings as unknown as Array<Object>
                ).find((element) => {
                    return (
                        element['compactLayoutId' as keyof Object] ===
                        defaultCompactLayoutId
                    );
                });

                if (recordTypeCompactLayoutMapping) {
                    const recordTypeId =
                        recordTypeCompactLayoutMapping[
                            'recordTypeId' as keyof Object
                        ];

                    // With the compact layout ID mapped back to recordType ID make another network request to get the
                    // exact compact layout info.
                    result = await conn.request(
                        `/services/data/v59.0/sobjects/${sObjectName}/describe/compactLayouts/${recordTypeId}`
                    );
                    if (result) {
                        return result[
                            'fieldItems' as keyof Object
                        ] as unknown as CompactLayoutField[];
                    }
                }
            }

            return Promise.resolve(fields);
        } catch (error) {
            console.log(error);
            return Promise.reject(error);
        }
    }

    public static async getDefaultUser(): Promise<string> {
        const aggregator = await ConfigAggregator.create();

        // When VSCode re-opens itself for a new project aggregator needs a
        // forced reload in order to get the currently authorized user.
        await aggregator.reload();

        const currentUserConfig = aggregator.getInfo(
            OrgConfigProperties.TARGET_ORG
        );

        if (currentUserConfig && currentUserConfig.value) {
            return Promise.resolve(currentUserConfig.value.toString());
        }
        return Promise.reject('no user');
    }
}
