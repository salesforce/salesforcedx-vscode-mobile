
/**
 * Object metadata.
 *
 * Keys:
 *    apiName (string): apiName
 */
export interface ObjectInfoRepresentation {
    apiName: string;
    associateEntityType: string | null;
    associateParentEntity: string | null;
    childRelationships: Array<ChildRelationshipRepresentation>;
    createable: boolean;
    custom: boolean;
    defaultRecordTypeId: string | null;
    deletable: boolean;
    // dependentFields: {
    //     [key: string]: {};
    // };
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
        [key: string]: RecordTypeInfoRepresentation;
    };
    searchable: boolean;
    updateable: boolean;
}


/**
 * Child Relationship.
 *
 * Keys:
 *    (none)
 */
export interface ChildRelationshipRepresentation {
    childObjectApiName: string;
    fieldName: string;
    junctionIdListNames: Array<string>;
    junctionReferenceTo: Array<string>;
    relationshipName: string;
}

/**
 * Field metadata.
 *
 * Keys:
 *    (none)
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
    extraTypeInfo: string | null;
    filterable: boolean;
//    filteredLookupInfo: FilteredLookupInfoRepresentation_FilteredLookupInfoRepresentation | null;
    highScaleNumber: boolean;
    htmlFormatted: boolean;
    inlineHelpText: string | null;
    label: string;
    length: number;
    nameField: boolean;
    polymorphicForeignKey: boolean;
    precision: number;
    reference: boolean;
    referenceTargetField: string | null;
    referenceToInfos: Array<ReferenceToInfoRepresentation>;
    relationshipName: string | null;
    required: boolean;
    scale: number;
    searchPrefilterable: boolean;
    sortable: boolean;
    unique: boolean;
    updateable: boolean;
}

/**
 * Record type.
 *
 * Keys:
 *    (none)
 */
export interface RecordTypeInfoRepresentation {
    available: boolean;
    defaultRecordTypeMapping: boolean;
    master: boolean;
    name: string;
    recordTypeId: string;
}

/**
 * Information about a reference field's referenced types and the name field names of those types.
 *
 * Keys:
 *    (none)
 */
export interface ReferenceToInfoRepresentation {
    apiName: string;
    nameFields: Array<string>;
}