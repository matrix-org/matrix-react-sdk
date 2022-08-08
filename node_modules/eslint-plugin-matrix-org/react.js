module.exports = {
    plugins: [
        "deprecate",
        "matrix-org",
        "react",
        "react-hooks",
    ],
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
    },
    rules: {
        "max-len": ["warn", {
            // Ignore pure JSX lines
            ignorePattern: '^\\s*<',
            ignoreComments: true,
            code: 120,
        }],

        // This just uses the React plugin to help ESLint known when
        // variables have been used in JSX
        "react/jsx-uses-vars": ["error"],
        // Don't mark React as unused if we're using JSX
        "react/jsx-uses-react": ["error"],

        // Components in JSX should always be defined
        "react/jsx-no-undef": ["error"],

        // Assert spacing before self-closing JSX tags, and no spacing before
        // or after the closing slash, and no spacing after the opening
        // bracket of the opening tag or closing tag.
        // https://github.com/yannickcr/eslint-plugin-react/blob/HEAD/docs/rules/jsx-tag-spacing.md
        "react/jsx-tag-spacing": ["error", {
            beforeClosing: "never",
        }],

        "react/jsx-curly-spacing": ["error", {
            allowMultiline: true,
            children: { when: "always" },
            attributes: { when: "never" },
        }],

        "react/jsx-curly-brace-presence": ["error", "never"],

        "react/jsx-equals-spacing": ["error", "never"],

        "react/no-direct-mutation-state": ["error"],
        "react/no-this-in-sfc": ["error"],
        "react/self-closing-comp": ["error"],
        "react/jsx-max-props-per-line": ["error", {"when": "multiline"}],

        "react-hooks/rules-of-hooks": ["error"],
        "react-hooks/exhaustive-deps": ["error"],
        "react/no-unknown-property": ["error"],

        "deprecate/import": ["error", {
            name: "enzyme",
            use: "@testing-library/react",
        }],
    }
}
