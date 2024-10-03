import { Edges } from './edges';
import { concatSkipBlank, preTab } from '../utils';
import {data as Account } from '../object_infos/Account';
import {data as User } from '../object_infos/User';

/**
 * for 'User(where: {FirstName: {eq:  "ben1"}}) { ... } 
 */
export class RecordQuery {
	apiName: string | undefined;
	edges: Edges|undefined;

	constructor(apiName: string|undefined, edges: Edges|undefined = undefined) {
		this.apiName = apiName;
		if (edges === undefined) {
			this.edges = new Edges();
		} else {
			this.edges = edges;
		}
	}

	public toString(): string {
		const chunks: string[] = [];
		chunks.push(`${this.apiName!==undefined?this.apiName+' ':''}{`);
		if (this.edges !== undefined) {
			this.edges.toString().split('\n').forEach((value, index) => {
				chunks.push(preTab(value));
			});
		}
		chunks.push('}');
		return concatSkipBlank(chunks, '\n');
	}

	/**
	 * parse 'User { ... }
	 */
	public static parse(input: string): { result?: RecordQuery, endPosition?: number, error?: Error, errorRegExp?: RegExp} {
		const prefixRegex = /\s*\S+\s*\{/g;
		const match = prefixRegex.exec(input);
		if (match !== null) { // find apiNme {
			const apiName = match[0].substring(0,match[0].length-1).trim();
			if (apiName !== 'Account' && apiName !== 'User') {
				return {error: new Error(`Invalid object name: ${apiName}`), errorRegExp: new RegExp(`\\s*${apiName}\\s*\\{`)};
			}
			const endIndex = input.lastIndexOf('}');
			if (endIndex > 0) {
				const nodeInputString = input.substring(prefixRegex.lastIndex, endIndex);
				const parsResult = Edges.parse(nodeInputString);
				if (parsResult.error !== undefined) {
					return {error: parsResult.error, errorRegExp: parsResult.errorRegExp};
				}
				const invalidFieldName = checkFieldNames(apiName, parsResult.result!);
				if (invalidFieldName!== undefined) {
					return {
						error: new Error(`Invalid field name: ${invalidFieldName} for ${apiName} object`), 
						errorRegExp: new RegExp(`\\s*${invalidFieldName}\\s*\\{`)};
				}
				return {result: new RecordQuery(apiName, parsResult.result), endPosition: endIndex+1};
			} else {
				return {error: new Error(`Missing } for ${apiName}`)};
			}	
		}
		return {error: new Error("missing record query")};
	}
}

function checkFieldNames(apiName: string, edges: Edges): string | undefined {
	const fields = Object.keys( apiName === 'Account'?Account.fields:User.fields);
	if (edges.node) {
		for (let index = 0; index < edges.node.fields.length; index++) {
			const field = edges.node.fields[index];
			if (fields.indexOf(field.name) === -1) {
				return field.name;
			}
		}
	}
	return undefined;
}