module.exports = {
    sourceMaps: "inline",
    assumptions: {
        setPublicClassFields: true,
    },
    presets: [
        [
            "@babel/preset-env",
            {
                targets: [
                    "last 2 Chrome versions",
                    "last 2 Firefox versions",
                    "last 2 Safari versions",
                    "last 2 Edge versions",
                ],
                include: ["@babel/plugin-proposal-class-properties"],
            },
        ],
        "@babel/preset-react",
        ["@babel/preset-typescript", { allowDeclareFields: true }],
    ],
    plugins: [
        "@babel/plugin-proposal-export-default-from",
        "@babel/plugin-proposal-numeric-separator",
        "@babel/plugin-proposal-object-rest-spread",
        "@babel/plugin-syntax-dynamic-import",
        "@babel/plugin-transform-runtime",
    ],
};
