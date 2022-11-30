module.exports = {
    "extends": "stylelint-config-standard",
    customSyntax: require('postcss-scss'),
    "plugins": [
        "stylelint-scss",
    ],
    "rules": {
        "color-hex-case": null,
        "indentation": 4,
        "comment-empty-line-before": null,
        "declaration-empty-line-before": null,
        "length-zero-no-unit": null,
        "rule-empty-line-before": null,
        "color-hex-length": null,
        "max-empty-lines": 1,
        "no-eol-whitespace": true,
        "number-no-trailing-zeros": null,
        "number-leading-zero": null,
        "selector-list-comma-newline-after": null,
        "at-rule-no-unknown": null,
        "no-descending-specificity": null,
        "no-empty-first-line": true,
        "scss/at-rule-no-unknown": [true, {
            // https://github.com/vector-im/element-web/issues/10544
            "ignoreAtRules": ["define-mixin"],
        }],
        // Disable `&_kind`-style selectors while our unused CSS approach is "Find & Replace All"
        // rather than a CI thing. Shorthand selectors are harder to detect when searching for a
        // class name. This regex is trying to *allow* anything except `&words`, such as `&::before`,
        // `&.mx_Class`, etc.
        "selector-nested-pattern": "^((&[ :.\\\[,])|([^&]))",
        "declaration-colon-space-after": "always-single-line",
        // Disable some defaults
        "selector-class-pattern": null,
        "custom-property-pattern": null,
        "selector-id-pattern": null,
        "keyframes-name-pattern": null,
        "string-quotes": null,
        "alpha-value-notation": null,
        "color-function-notation": null,
        "selector-not-notation": null,
        "import-notation": null,
        "value-keyword-case": null,
        "declaration-block-no-redundant-longhand-properties": null,
        "shorthand-property-no-redundant-values": null,
        "property-no-vendor-prefix": null,
        "value-no-vendor-prefix": null,
        "selector-no-vendor-prefix": null,
        "media-feature-name-no-vendor-prefix": null,
        "number-max-precision": null,
        "no-invalid-double-slash-comments": true,
    },
}
