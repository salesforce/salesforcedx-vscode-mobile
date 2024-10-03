import { Node } from './node';
import { concatSkipBlank, preTab } from '../utils';

/**
 * for edges { ... }
 */
export class Edges {
	node: Node|undefined;

	constructor(node: Node|undefined = undefined) {
		this.node = node===undefined?new Node():node;
	}

	public toString(): string {
		const chunks: string[] = [];
		chunks.push('edges {');
		if (this.node !== undefined) {
			this.node.toString().split('\n').forEach((value, index) => {
				chunks.push(preTab(value));
			});
		}
		chunks.push('}');
		return concatSkipBlank(chunks, '\n');
	}

	/**
	 * parse 'edges { ... }
	 */
	public static parse(input: string): { result?: Edges, endPosition?: number, error?: Error,errorRegExp?: RegExp} {
		const prefixRegex = /\s*edges\s*\{/g;
		const match = prefixRegex.exec(input);
		if (match !== null) { // find node {
			const endIndex = input.lastIndexOf('}');
			if (endIndex > 0) {
				const nodeInputString = input.substring(prefixRegex.lastIndex, endIndex);
				const parsResult = Node.parse(nodeInputString);
				if (parsResult.error!==undefined) {
					return {error: parsResult.error, errorRegExp: parsResult.errorRegExp};
				}
				return {result: new Edges(parsResult.result), endPosition: endIndex+1};
			} else {
				return {error: new Error('missing } for edges')};
			}
		}
		return {error: Error("missing edges")};
	}
}