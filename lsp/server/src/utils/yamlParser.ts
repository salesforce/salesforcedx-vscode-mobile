import { parse } from 'yaml';

export function transformYamlToObject(
    yamlContent: string,
    topLevelProperty: string
): Record<string, string[]> {
    // Parse the YAML content
    const parsedYaml = parse(yamlContent);

    // Check if the top-level(<template>) property exists
    if (!(topLevelProperty in parsedYaml)) {
        throw new Error(
            `Top-level property "${topLevelProperty}" not found in the YAML.`
        );
    }

    const result: Record<string, string[]> = {};

    // Access the top-level property
    const secondLevel = parsedYaml[topLevelProperty];

    // Loop through the second-level properties
    for (const [key, value] of Object.entries(secondLevel)) {
        // Ensure the value is an array (in YAML these arrays are represented with '-')
        if (
            Array.isArray(value) &&
            value.every((item) => typeof item === 'string')
        ) {
            result[key] = value;
        } else {
            throw new Error(
                `The property "${key}" does not contain an array of strings.`
            );
        }
    }

    return result;
}
