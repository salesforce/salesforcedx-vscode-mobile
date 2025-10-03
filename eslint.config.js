const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");

module.exports = [
    {
        files: ["**/*.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 6,
            sourceType: "module",
        },
        rules: {
            "@typescript-eslint/naming-convention": [
                "warn",
                {
                    selector: "variable",
                    format: ["camelCase", "UPPER_CASE"],
                },
                {
                    selector: "property",
                    modifiers: ["static", "readonly"],
                    format: ["UPPER_CASE"],
                },
                {
                    selector: "property",
                    format: ["camelCase"],
                },
            ],
            curly: "warn",
            eqeqeq: "warn",
            "no-throw-literal": "warn",
            semi: "off",
        },
    },
    {
        ignores: ["out/**", "dist/**", "**/*.d.ts"],
    },
];
