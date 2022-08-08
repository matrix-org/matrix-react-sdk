module.exports = {
    rules: {
        "require-copyright-header": require("./rules/copyright")
    },
    configs: {
        "babel": require("./babel"),
        "javascript": require("./javascript"),
        "react": require("./react"),
        "typescript": require("./typescript"),
        "a11y": require("./a11y"),
    },
};
