/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export interface FieldRepresentation {
    apiName: string;
    calculated: boolean;
    compound: boolean;
    compoundComponentName: string | null;
    compoundFieldName: string | null;
    controllerName: string | null;
    controllingFields: Array<string>;
    createable: boolean;
    custom: boolean;
    dataType: string;
    externalId: boolean;
    extraTypeInfo: string | null;
    filterable: boolean;
    filteredLookupInfo: any;
    highScaleNumber: boolean;
    htmlFormatted: boolean;
    inlineHelpText: string | null;
    label: string;
    length: number;
    maskType: string | null;
    nameField: boolean;
    polymorphicForeignKey: boolean;
    precision: number;
    reference: boolean;
    referenceTargetField: string | null;
    referenceToInfos: any;
    relationshipName: string | null;
    required: boolean;
    scale: number;
    searchPrefilterable: boolean;
    sortable: boolean;
    unique: boolean;
    updateable: boolean;
}
