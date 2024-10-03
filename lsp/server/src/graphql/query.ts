/**
 * for no root:  'query {}' 
 */

import { RecordQuery } from './recordQuery';
import { concatSkipBlank, preTab } from '../utils';

export class Query {
	recordQuery: RecordQuery|undefined;

	constructor(recordQuery: RecordQuery|undefined = undefined) {
		this.recordQuery = recordQuery;
	}

	public toString(): string {
		const chunks: string[] = [];
		chunks.push('query {');
		if (this.recordQuery !== undefined) {
			this.recordQuery.toString().split('\n').forEach((value, index) => {
				chunks.push(preTab(value));
			});
		}
		chunks.push('}');
		return concatSkipBlank(chunks, '\n');
	}

	/**
	 * parse 'query { ... }
	 */
	public static parse(input: string): { result?: Query, endPosition?: number, error?: Error, errorRegExp?: RegExp} {
		const prefixRegex = /\s*query\s*\{/g;
		const match = prefixRegex.exec(input);
		if (match !== null) { // find node {
			const endIndex = input.lastIndexOf('}');
			if (endIndex > 0) {
				const nodeInputString = input.substring(prefixRegex.lastIndex, endIndex);
				const parsResult = RecordQuery.parse(nodeInputString);
				if (parsResult.error !== undefined) {
					return {error: parsResult.error, errorRegExp: parsResult.errorRegExp};
				}
				return {result: new Query(parsResult.result), endPosition: endIndex+1};
			}
			else {
				return {error: new Error("missing } for inner query node")};
			}
		}
		return {error: new Error("missing query { ... } ")};
	}
}