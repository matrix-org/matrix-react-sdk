import {applyDOM, undoDOM} from "./dom/index"
import {DiffFinder} from "./virtual/index"
export {nodeToObj, stringToObj} from "./virtual/index"

const DEFAULT_OPTIONS = {
    debug: false,
    diffcap: 10, // Limit for how many diffs are accepting when debugging. Inactive when debug is false.
    maxDepth: false, // False or a numeral. If set to a numeral, limits the level of depth that the the diff mechanism looks for differences. If false, goes through the entire tree.
    maxChildCount: 50, // False or a numeral. If set to a numeral, only does a simplified form of diffing of contents so that the number of diffs cannot be higher than the number of child nodes.
    valueDiffing: true, // Whether to take into consideration the values of forms that differ from auto assigned values (when a user fills out a form).
    // syntax: textDiff: function (node, currentValue, expectedValue, newValue)
    textDiff(node, currentValue, expectedValue, newValue) {
        node.data = newValue
        return
    },
    // empty functions were benchmarked as running faster than both
    // `f && f()` and `if (f) { f(); }`
    preVirtualDiffApply() {},
    postVirtualDiffApply() {},
    preDiffApply() {},
    postDiffApply() {},
    filterOuterDiff: null,
    compress: false, // Whether to work with compressed diffs
    _const: false, // object with strings for every change types to be used in diffs.
    document: window && window.document ? window.document : false
}


export class DiffDOM {
    constructor(options = {}) {

        this.options = options
        // IE11 doesn't have Object.assign and buble doesn't translate object spreaders
        // by default, so this is the safest way of doing it currently.
        Object.entries(DEFAULT_OPTIONS).forEach(([key, value]) => {
            if (!Object.prototype.hasOwnProperty.call(this.options, key)) {
                this.options[key] = value
            }
        })

        if (!this.options._const) {
            const varNames = ["addAttribute", "modifyAttribute", "removeAttribute",
                "modifyTextElement", "relocateGroup", "removeElement", "addElement",
                "removeTextElement", "addTextElement", "replaceElement", "modifyValue",
                "modifyChecked", "modifySelected", "modifyComment", "action", "route",
                "oldValue", "newValue", "element", "group", "from", "to", "name",
                "value", "data", "attributes", "nodeName", "childNodes", "checked",
                "selected"
            ]
            this.options._const = {}
            if (this.options.compress) {
                varNames.forEach((varName, index) => this.options._const[varName] = index)
            } else {
                varNames.forEach(varName => this.options._const[varName] = varName)
            }
        }

        this.DiffFinder = DiffFinder

    }

    apply(tree, diffs) {
        return applyDOM(tree, diffs, this.options)
    }

    undo(tree, diffs) {
        return undoDOM(tree, diffs, this.options)
    }

    diff(t1Node, t2Node) {
        const finder = new this.DiffFinder(t1Node, t2Node, this.options)
        return finder.init()
    }

}
