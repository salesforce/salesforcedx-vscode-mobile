/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import type { FieldRepresentation } from './FieldRepresentation';
export interface ObjectInfoRepresentation {
    apiName: string;
    associateEntityType: string | null;
    associateParentEntity: string | null;
    childRelationships: Array<any>;
    compactLayoutable: boolean;
    createable: boolean;
    custom: boolean;
    defaultRecordTypeId: string | null;
    deletable: boolean;
    dependentFields: {
        [key: string]: {};
    };
    eTag: string;
    feedEnabled: boolean;
    fields: {
        [key: string]: FieldRepresentation;
    };
    keyPrefix: string | null;
    label: string;
    labelPlural: string;
    layoutable: boolean;
    mruEnabled: boolean;
    nameFields: Array<string>;
    queryable: boolean;
    recordTypeInfos: {
        [key: string]: any;
    };
    searchLayoutable: boolean;
    searchable: boolean;
    themeInfo: any;
    updateable: boolean;
}
