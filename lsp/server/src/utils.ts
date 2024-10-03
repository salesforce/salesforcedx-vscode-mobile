export function preTab(input: string) {
    return `\t${input}`;
}

export function newLine(input: string) {
    return `${input}\n`;
}

export function concatSkipBlank(
    input: string[],
    separator: string = ''
): string {
    return input
        .filter((item) => {
            return item !== undefined && item !== '';
        })
        .join(separator);
}

export function preTabLines(input: string) {
    return input
        .split('\n')
        .map((item) => {
            return preTab(item);
        })
        .join('\n');
}
