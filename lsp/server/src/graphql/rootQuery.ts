import { UiApi } from './uiapi';
import { concatSkipBlank, preTab } from '../utils';

export class RootQuery {
	uiapi: UiApi|undefined;

	constructor(uiapi: UiApi|undefined = undefined) {
		this.uiapi = uiapi===undefined? new UiApi(): uiapi;
	}

	public toString(): string {
		const chunks: string[] = [];
		chunks.push('query {');
		if (this.uiapi !== undefined) {
			this.uiapi.toString().split('\n').forEach((value, index) => {
				chunks.push(preTab(value));
			});
		}
		chunks.push('}');
		return concatSkipBlank(chunks, '\n');
	}

	/**
	 * parse 'query { ... }
	 */
	public static parse(input: string): { 
		result?: RootQuery|undefined, 
		endPosition?: number, 
		error?: Error, 
		errorRegExp?: RegExp
	} 
	{
		const prefixRegex = /\s*query\s*\{/g;
		const match = prefixRegex.exec(input);
		if (match !== null) { // find node {
			const endIndex = input.lastIndexOf('}');
			if (endIndex > 0) {
				const nodeInputString = input.substring(prefixRegex.lastIndex, endIndex);
				const parsResult = UiApi.parse(nodeInputString);
				if (parsResult.error !== undefined) {
					return {error: parsResult.error, errorRegExp: parsResult.errorRegExp};
				}
				return {result: new RootQuery(parsResult.result), endPosition: endIndex+1};
			} else {
				return {error: new Error("missing ending }")};
			}
		}
		return {error: new Error("missing root query { ... }")};
	}
}