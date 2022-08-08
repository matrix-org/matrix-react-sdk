module.exports = {
    plugins: [
        "@babel",
        "matrix-org",
    ],
    extends: [
        "plugin:matrix-org/javascript",
    ],
    parser: "@babel/eslint-parser", // Needed for class properties
    parserOptions: {
        sourceType: "module",
    },
    env: {
        // We expect all projects to use ES6 or newer
        es6: true,
        jest: true,
    },
    rules: {
        // ESLint's built in `no-invalid-this` rule breaks with class properties
        "no-invalid-this": "off",
        // ...so we replace it with a version that is class property aware
        "@babel/no-invalid-this": "error",
    },
}
