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

export type SObjectCompactLayoutMapping = {
    compactLayoutId: string | null;
    compactLayoutName: string;
    recordTypeId: string;
};

export type SObjectCompactLayouts = {
    defaultCompactLayoutId: string | null;
    recordTypeCompactLayoutMappings: SObjectCompactLayoutMapping[];
};

export type SObjectCompactLayout = {
    fieldItems: CompactLayoutField[];
};

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

    public static async getCompactLayoutsForSObject(
        sObjectName: string
    ): Promise<SObjectCompactLayouts> {
        const org = await Org.create();
        const conn = org.getConnection();

        const result = await conn.request<SObjectCompactLayouts>(
            `/services/data/v59.0/sobjects/${sObjectName}/describe/compactLayouts`
        );

        return Promise.resolve(result);
    }

    public static async getCompactLayoutForSObject(
        sObjectName: string,
        recordTypeId: string
    ): Promise<SObjectCompactLayout> {
        const org = await Org.create();
        const conn = org.getConnection();

        const result = await conn.request<SObjectCompactLayout>(
            `/services/data/v59.0/sobjects/${sObjectName}/describe/compactLayouts/${recordTypeId}`
        );

        return Promise.resolve(result);
    }

    public static async getCompactLayoutFieldsForSObject(
        sObjectName: string
    ): Promise<CompactLayoutField[]> {
        try {
            const fields: CompactLayoutField[] = [];

            // Get all the compact layouts associated to this sObject first
            let result = await this.getCompactLayoutsForSObject(sObjectName);

            if (result) {
                // sObject can have multiple compact layouts associated with it. Get the default.
                const defaultCompactLayoutId = result.defaultCompactLayoutId;
                result['defaultCompactLayoutId'];

                // Mapping table
                const recordTypeCompactLayoutMappings =
                    result.recordTypeCompactLayoutMappings;

                // ID of compact layout need to be normalized
                const recordTypeCompactLayoutMapping =
                    recordTypeCompactLayoutMappings.find((element) => {
                        if (defaultCompactLayoutId) {
                            return (
                                element.compactLayoutId ===
                                defaultCompactLayoutId
                            );
                        } else {
                            // defaultCompactLayoutId can be null when a compact layout is not assigned.
                            // In that case sObject will always have one default layout called SYSTEM.
                            // So use that instead.
                            return element.compactLayoutName === 'SYSTEM';
                        }
                    });

                if (recordTypeCompactLayoutMapping) {
                    // With the compact layout ID mapped back to the recordType ID, make another network request to get the
                    // exact compact layout info.
                    const compactLayout = await this.getCompactLayoutForSObject(
                        sObjectName,
                        recordTypeCompactLayoutMapping.recordTypeId
                    );

                    if (compactLayout) {
                        return compactLayout.fieldItems;
                    }
                }
            }

            return Promise.resolve(fields);
        } catch (error) {
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
