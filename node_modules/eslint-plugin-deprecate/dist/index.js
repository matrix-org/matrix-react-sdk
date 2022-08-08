'use strict';

var rules = {
    function: require('./rules/function'),
    import: require('./rules/import'),
    'member-expression': require('./rules/member-expression')
};

module.exports = { rules: rules };