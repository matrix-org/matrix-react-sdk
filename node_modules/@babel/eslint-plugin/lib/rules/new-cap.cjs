const ruleComposer = require("eslint-rule-composer");

const eslint = require("eslint");

const rule = new eslint.Linter().getRules().get("new-cap");

function isDecorator(node) {
  return node.parent.type === "Decorator";
}

module.exports = ruleComposer.filterReports(rule, problem => !isDecorator(problem.node));