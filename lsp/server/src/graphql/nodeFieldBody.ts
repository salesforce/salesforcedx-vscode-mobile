import { concatSkipBlank, preTab } from '../utils';

/**
 * support { value }
 */

export class NodeFieldBody {
	hasValue: boolean;
	hasDisplayValue: boolean;
	constructor(hasValue: boolean, hasDispalyValue: boolean = false) {
		this.hasValue = hasValue;
		this.hasDisplayValue = hasDispalyValue;
	}

	public toString(): string | undefined {
		if (this.hasValue || this.hasDisplayValue) {
			return concatSkipBlank([
				'{',
				this.hasValue ? preTab('value') : '',
				this.hasDisplayValue ? preTab('displayValue') : '',
				'}'
			], '\n');
		}
		return undefined;
	}

	/**
	 * parse {}, {value},  {displayValue} or {value displayValue}
	 * @param input
	 */
	public static parse(input: string): { result?: NodeFieldBody, endPosition?: number, error?: Error} | undefined {
		const str = input.trimStart();
		if (str.startsWith('{')) {
			const end = str.indexOf('}');
			if (end === -1) {
				return {error: Error(`missing } for ${input}`)};
			}
			const endPosition = end + 1;
			const words = str.substring(1, end).trim();
			const wordArray = words.replace(/\s{1,}/g, ' ').split(' ');
			if (words.length === 0) {
				return undefined;
			}
			if (wordArray.length === 1) {
				if (wordArray.includes('value')) {
					return { result: new NodeFieldBody(true), endPosition };
				}
				if (wordArray.includes('displayValue')) {
					return { result: new NodeFieldBody(false, true), endPosition };
				}
			}
			if (wordArray.length === 2 && wordArray.includes('value') && wordArray.includes('displayValue')) {
				return { result: new NodeFieldBody(true, true), endPosition };
			}
			return {error: Error(`invalid field body: ${str.substring(0, endPosition)}`)};
		}
		return undefined;
	}
}
