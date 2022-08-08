'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function makeMemberObj(memberName) {
    if (typeof memberName === 'string') {
        return { name: memberName };
    }
    if ((typeof memberName === 'undefined' ? 'undefined' : _typeof(memberName)) === 'object' && memberName.name && memberName.use) {
        return memberName;
    }
    throw new Error('Unsupported type of argument ' + JSON.stringify(memberName));
}

module.exports = {
    meta: {
        docs: {
            description: 'forbid some func names'
        }
    },
    create: function create(context) {
        var memberStrMap = {};
        context.options.map(makeMemberObj).forEach(function (importObj) {
            memberStrMap[importObj.name] = importObj;
        });
        return {
            MemberExpression: function MemberExpression(node) {
                var isObjectIndetifier = node.object && node.object.type === 'Identifier';
                if (!isObjectIndetifier) return;
                var isPropertyIdentifier = node.property && node.property.type === 'Identifier';
                if (!isPropertyIdentifier) return;
                var exprStr = node.object.name + '.' + node.property.name;

                var memberStr = memberStrMap[exprStr];
                if (!memberStr) {
                    return;
                }
                var errorMsg = 'Member expression ' + memberStr.name + ' is deprecated.';
                if (memberStr.use) {
                    errorMsg += ' Use ' + memberStr.use + ' instead';
                }
                context.report({ node: node, message: errorMsg });
            }
        };
    }
};