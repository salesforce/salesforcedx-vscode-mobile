
/**
 * sample field type supported by sf object fields
 */
export declare enum FieldType {
	DateTime = "DateTime",
	String = "String",
	TextArea = "TextArea",
	Double = "Double",
	Phone = "Phone",
	Boolean = "Boolean",
	Int = "Int",
}

/**
 * sample graphql operators 
 */
export declare enum ComparisionOperator {
	eq = "eq",
    ne = "ne",
    like = "like",
    lt = "lt",
    gt = "gt",
    lte = "lte",
    gte = "gte",
    in = "in",
    nin = "nin",
    excludes = "excludes",
    includes = "includes",
}

const BooleanOperators = [
	ComparisionOperator.eq, 
	ComparisionOperator.ne
];

const NumberOperators = [...BooleanOperators, 
	ComparisionOperator.lt,
	ComparisionOperator.gt,
	ComparisionOperator.lte,
	ComparisionOperator.gte,
];

const StringOperators = [... NumberOperators,
	ComparisionOperator.like
];

/**
 * the field type to supported operators map. 
 */
export const FieldTypeToOperatorsMap = new Map<FieldType, ComparisionOperator[]>([
	[FieldType.Boolean, BooleanOperators],
	[FieldType.Int, NumberOperators],
	[FieldType.Double, NumberOperators],
	[FieldType.String, StringOperators],
]);






