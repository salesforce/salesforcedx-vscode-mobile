import { NodeFieldBody } from './nodeFieldBody';

export enum NodeFieldType {
	NO_VALUE = "no_value",  // { node {Id} }
	WITH_VALUE = "with_value", // {node { Name { value displayValue }}}
	PARENT_RELATIONSHIP = "parent_relationship",
	CHILDREN_RELATIONSHIP = "children_relationship"
}

export class NodeField {

	name: string;
	type: NodeFieldType;
	body: NodeFieldBody | undefined = undefined;

	constructor(name: string, type: NodeFieldType, body: NodeFieldBody | undefined = undefined) {
		this.name = name;
		this.type = type;
		this.body = body;
	}

	public toString(): string {
		if (this.type === NodeFieldType.NO_VALUE) {
			return this.name;
		}
		if (this.type === NodeFieldType.WITH_VALUE) {
			return `${this.name} ${this.body?.toString()}`;
		}
		throw Error(`toString() to be implemented for ${this.type}`);
	}
	
	/**
	 * parse Id, Name { value }, Name { value displayValue }
	 * @param input 
	 */
	public static parse(input: string): {result?: NodeField, lastPosition?: number, error?: Error} {
		const regex = /\s*\S+\s*/g;
		const match = regex.exec(input);
		if (match !== null) {
			const name = match[0].trim();
			const body = NodeFieldBody.parse(input.substring(regex.lastIndex));
			if (body === undefined || body.result === undefined) {
				return {result: new NodeField(name, NodeFieldType.NO_VALUE), lastPosition: regex.lastIndex};
			} 
			if (body.error!==undefined) {
				return {error: body.error};
			}
			return {result: new NodeField(name, NodeFieldType.WITH_VALUE, body.result), lastPosition: regex.lastIndex + body.endPosition! };
		}
		return {error: new Error("missing fieldName")};
	}
}



