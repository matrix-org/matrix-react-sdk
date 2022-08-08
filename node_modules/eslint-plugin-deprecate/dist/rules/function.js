'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function makeFuncObj(funcName) {
    if (typeof funcName === 'string') {
        return { name: funcName };
    }
    if ((typeof funcName === 'undefined' ? 'undefined' : _typeof(funcName)) === 'object' && funcName.name && funcName.use) {
        return funcName;
    }
    throw new Error('Unsupported type of argument ' + JSON.stringify(funcName));
}

module.exports = {
    meta: {
        docs: {
            description: 'forbid some func names'
        }
    },
    create: function create(context) {
        var funcs = {};
        context.options.map(makeFuncObj).forEach(function (fnObj) {
            funcs[fnObj.name] = fnObj;
        });

        return {
            CallExpression: function CallExpression(node) {
                var fn = funcs[node.callee.name];
                if (!fn) {
                    return;
                }
                var errorMsg = 'Function ' + fn.name + ' is deprecated.';
                if (fn.use) {
                    errorMsg += ' Use ' + fn.use + ' instead';
                }
                context.report({ node: node, message: errorMsg });
            }
        };
    }
};