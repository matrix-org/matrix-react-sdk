module.exports = {
    "extends": "stylelint-config-standard",
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
        "max-empty-lines": null,
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
    }
}
