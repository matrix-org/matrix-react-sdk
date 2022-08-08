module.exports = {
    plugins: [
        "@typescript-eslint",
        "matrix-org",
    ],
    extends: [
        "plugin:matrix-org/javascript",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    parser: "@typescript-eslint/parser",
    rules: {
        // Allow the use of underscore to show args are not used.
        // This is helpful for seeing that a function implements
        // an interface but won't be using one of it's arguments.
        "@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
        "@typescript-eslint/no-empty-function": ["off"],

        "@typescript-eslint/explicit-module-boundary-types": ["off"],
        "@typescript-eslint/ban-types": ["off"],

        // We use IProps and IState
        "@typescript-eslint/interface-name-prefix": ["off"],

        // Require spaces after colons and around arrows
        "@typescript-eslint/type-annotation-spacing": ["error"],

        // `typescript-eslint` has a rule for semis which conflicts with the
        // original ESLint core rule.
        "semi": ["off"],
        "@typescript-eslint/semi": ["error"],

        // Similarly, enforce semicolons between members (ie. in types / interfaces)
        "@typescript-eslint/member-delimiter-style": ["error", {
            "multiline": {
                "delimiter": "semi",
                "requireLast": true,
            },
            "singleline": {
                "delimiter": "comma",
                "requireLast": false,
            },
        }],

        // We're relying on TS types and going with more ad hoc JS docs
        "valid-jsdoc": ["off"],

        // Replace base ESLint's `no-invalid-this` with TS aware version
        "no-invalid-this": ["off"],
        "@typescript-eslint/no-invalid-this": ["error"],

        // XXX: for now the enum, enumMember, property and more have been disabled as there are too many violations
        "@typescript-eslint/naming-convention": ["error", {
            selector: [
                // "variableLike",
                // "property",
                "parameterProperty",
                "classMethod",
                "typeMethod",
                "classMethod",
                "typeMethod",
                "accessor",
            ],
            format: ["camelCase"],
            leadingUnderscore: "forbid",
        }, {
            selector: ["function", "parameter", "objectLiteralMethod"],
            format: ["camelCase", "PascalCase"],
            leadingUnderscore: "allow",
        }, {
            selector: [
                "class",
                "typeAlias",
                // "enum",
                // "enumMember",
                "typeParameter",
            ],
            format: ["PascalCase"],
            leadingUnderscore: "forbid",
            // }, {
            //     selector: "interface",
            //     format: ["PascalCase"],
            //     custom: {
            //         regex: "^I[A-Z]",
            //         match: true,
            //     },
        }],
    }
}
