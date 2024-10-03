import { concatSkipBlank, preTab } from '../utils';
import { NodeField } from './nodeField';
/**
 * for node { ... }
 */
export class Node {
	fields:  NodeField[];
	constructor(fields: NodeField[] = []) {
		this.fields = fields;
	}

	public toString(): string {
		const chunks: string[] = [];
		chunks.push('node {');
		this.fields.forEach((field)=>{
			field.toString().split('\n').forEach((value, index) => {
				chunks.push(preTab(value));
			});
		});
		chunks.push('}');
		return concatSkipBlank(chunks, '\n');
	}

	/**
	 * parse 'node { Id }', 'node { Name { value } }', ...
	 * @param input 
	 * @returns 
	 */
	public static parse(input: string): {result?: Node|undefined, lastPosition?:number, error?: Error, errorRegExp?: RegExp} {
		const prefixRegex = /\s*node\s*\{/g;
		const match = prefixRegex.exec(input);
		if (match !== null) { // find node {
			const endIndex = input.lastIndexOf('}');
			if (endIndex > 0) {
				let fieldsInputString = input.substring(prefixRegex.lastIndex, endIndex).trim();
				let nodeField = NodeField.parse(fieldsInputString);
				if (nodeField.error!==undefined) {
					return {error: nodeField.error};
				}
				const fields: NodeField[] = [];
				while (nodeField.result !== undefined) {
					fields.push(nodeField.result);
					fieldsInputString = fieldsInputString.substring(nodeField.lastPosition!).trim();
					if (fieldsInputString.length === 0) {
						break;
					}
					nodeField = NodeField.parse(fieldsInputString);
					if (nodeField.error!==undefined) {
						return {error: nodeField.error};
					}
				}
				if (fields.length === 0) {
					return {error: new Error("no field specified"), errorRegExp:prefixRegex};
				}
				const duplicateFieldName = checkDuplicateFields(fields);
				if (duplicateFieldName!==undefined) {
					return {error: new Error(`duplicate fieldName: ${duplicateFieldName}`), errorRegExp: new RegExp(`\\s*${duplicateFieldName}\\s*\\{`)};
				} 
				return {result: new Node(fields)};
			} else {
				return {error: new Error('missing } for node')};
			}
		}
		return {error: new Error("missing node")};
	}
}

function checkDuplicateFields(fields: NodeField[]): string | undefined {
	const fieldNames = fields.map((nodeField) => {
		return nodeField.name;
	});
	for (let index = 0; index < fieldNames.length; index++) {
		const fieldName = fieldNames[index];
		if (index !== fieldNames.lastIndexOf(fieldName)) {
			return fieldName;
		}
	}
	return undefined;
}