/**
 * for no root:  'uiapi {}' 
 */

import { Query } from './query';
import { concatSkipBlank, preTab } from '../utils';
import { error } from 'console';

export class UiApi {
	query: Query|undefined;

	constructor(query: Query | undefined = undefined) {
		this.query = query === undefined? new Query():query;
	}

	public toString(): string {
		const chunks: string[] = [];
		chunks.push('uiapi {');
		if (this.query !== undefined) {
			this.query.toString().split('\n').forEach((value, index) => {
				chunks.push(preTab(value));
			});
		}
		chunks.push('}');
		return concatSkipBlank(chunks, '\n');
	}

	/**
	 * parse 'uiapi { ... }
	 */
	public static parse(input: string): { result?: UiApi, endPosition?: number, error?: Error, errorRegExp?: RegExp} {
		const prefixRegex = /\s*uiapi\s*\{/g;
		const match = prefixRegex.exec(input);
		if (match !== null) { // find node {
			const endIndex = input.lastIndexOf('}');
			if (endIndex > 0) {
				const nodeInputString = input.substring(prefixRegex.lastIndex, endIndex);
				const parsResult = Query.parse(nodeInputString);
				if (parsResult.error !== undefined) {
					return {error: parsResult.error, errorRegExp: parsResult.errorRegExp};
				}
				return {result: new UiApi(parsResult.result), endPosition: endIndex+1};
			} else {
				return {error: new Error("missing } for uiapi node.")};
			}
		}
		return {error: new Error(" missing uiapi { ... }")};
	}
}