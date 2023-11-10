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

    public static async getCompactLayoutForSObject(
        sObjectName: string
    ): Promise<string[]> {
        try {
            const org = await Org.create();
            const conn = org.getConnection();
            const result = await conn.request(
                `/services/data/v59.0/sobjects/${sObjectName}/describe/compactLayouts`
            );
            const fields: string[] = [];
            const resultObj = result as Object;
            const compactLayouts = resultObj['compactLayouts' as keyof Object];
            if (Array.isArray(compactLayouts)) {
                compactLayouts.forEach((compactLayout) => {
                    const fieldItems = compactLayout['fieldItems'];
                    fieldItems.forEach((fieldItem: { [key: string]: any }) => {
                        const editableForNew = fieldItem['editableForNew'];
                        const editableForUpdate =
                            fieldItem['editableForUpdate'];
                        if (editableForNew && editableForUpdate) {
                            const layoutComponents =
                                fieldItem['layoutComponents'];
                            if (Array.isArray(layoutComponents)) {
                                const layoutComponent = layoutComponents[0];
                                const layoutComponentType =
                                    layoutComponent['type'];
                                if (layoutComponentType === 'Field') {
                                    fields.push(layoutComponent['value']);
                                }
                            }
                        }
                    });
                });
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
