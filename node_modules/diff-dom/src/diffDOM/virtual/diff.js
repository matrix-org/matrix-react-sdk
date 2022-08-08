import {Diff, DiffTracker, cloneObj, getGapInformation, isEqual, markSubTrees, removeDone, roughlyEqual} from "./helpers"
import {applyVirtual} from "./apply"
import {nodeToObj} from "./fromDOM"
import {stringToObj} from "./fromString"

// ===== Create a diff =====

export class DiffFinder {
    constructor(t1Node, t2Node, options) {
        this.options = options
        this.t1 = (t1Node instanceof HTMLElement) ? nodeToObj(t1Node, this.options) : (typeof t1Node === 'string') ? stringToObj(t1Node, this.options) : JSON.parse(JSON.stringify(t1Node))
        this.t2 = (t2Node instanceof HTMLElement) ? nodeToObj(t2Node, this.options) : (typeof t2Node === 'string') ? stringToObj(t2Node, this.options) : JSON.parse(JSON.stringify(t2Node))
        this.diffcount = 0
        this.foundAll = false
        if (this.debug) {
            this.t1Orig = nodeToObj(t1Node, this.options)
            this.t2Orig = nodeToObj(t2Node, this.options)
        }

        this.tracker = new DiffTracker()
    }

    init() {
        return this.findDiffs(this.t1, this.t2)
    }

    findDiffs(t1, t2) {
        let diffs
        do {
            if (this.options.debug) {
                this.diffcount += 1
                if (this.diffcount > this.options.diffcap) {
                    window.diffError = [this.t1Orig, this.t2Orig]
                    throw new Error(`surpassed diffcap:${JSON.stringify(this.t1Orig)} -> ${JSON.stringify(this.t2Orig)}`)
                }
            }
            diffs = this.findNextDiff(t1, t2, [])

            if (diffs.length === 0) {
                // Last check if the elements really are the same now.
                // If not, remove all info about being done and start over.
                // Sometimes a node can be marked as done, but the creation of subsequent diffs means that it has to be changed again.
                if (!isEqual(t1, t2)) {
                    if (this.foundAll) {
                        console.error('Could not find remaining diffs!')
                    } else {
                        this.foundAll = true
                        removeDone(t1)
                        diffs = this.findNextDiff(t1, t2, [])
                    }
                }
            }
            if (diffs.length > 0) {
                this.foundAll = false
                this.tracker.add(diffs)
                applyVirtual(t1, diffs, this.options)
            }
        } while (diffs.length > 0)

        return this.tracker.list
    }

    findNextDiff(t1, t2, route) {
        let diffs
        let fdiffs

        if (this.options.maxDepth && route.length > this.options.maxDepth) {
            return []
        }
        // outer differences?
        if (!t1.outerDone) {
            diffs = this.findOuterDiff(t1, t2, route)
            if (this.options.filterOuterDiff) {
                fdiffs = this.options.filterOuterDiff(t1, t2, diffs)
                if (fdiffs) diffs = fdiffs
            }
            if (diffs.length > 0) {
                t1.outerDone = true
                return diffs
            } else {
                t1.outerDone = true
            }
        }
        // inner differences?
        if (!t1.innerDone) {
            diffs = this.findInnerDiff(t1, t2, route)
            if (diffs.length > 0) {
                return diffs
            } else {
                t1.innerDone = true
            }
        }

        if (this.options.valueDiffing && !t1.valueDone) {
            // value differences?
            diffs = this.findValueDiff(t1, t2, route)

            if (diffs.length > 0) {
                t1.valueDone = true
                return diffs
            } else {
                t1.valueDone = true
            }
        }

        // no differences
        return []
    }

    findOuterDiff(t1, t2, route) {
        const diffs = []
        let attr
        let attr1
        let attr2
        let attrLength
        let pos
        let i
        if (t1.nodeName !== t2.nodeName) {
            if (!route.length) {
                throw new Error('Top level nodes have to be of the same kind.')
            }
            return [new Diff()
                .setValue(this.options._const.action, this.options._const.replaceElement)
                .setValue(this.options._const.oldValue, cloneObj(t1))
                .setValue(this.options._const.newValue, cloneObj(t2))
                .setValue(this.options._const.route, route)
            ]
        }
        if (route.length && this.options.maxNodeDiffCount < Math.abs((t1.childNodes || []).length - (t2.childNodes || []).length)) {
            return [new Diff()
                .setValue(this.options._const.action, this.options._const.replaceElement)
                .setValue(this.options._const.oldValue, cloneObj(t1))
                .setValue(this.options._const.newValue, cloneObj(t2))
                .setValue(this.options._const.route, route)
            ]
        }

        if (t1.data !== t2.data) {
            // Comment or text node.
            if (t1.nodeName === '#text') {
                return [new Diff()
                    .setValue(this.options._const.action, this.options._const.modifyTextElement)
                    .setValue(this.options._const.route, route)
                    .setValue(this.options._const.oldValue, t1.data)
                    .setValue(this.options._const.newValue, t2.data)
                ]
            } else {
                return [new Diff()
                    .setValue(this.options._const.action, this.options._const.modifyComment)
                    .setValue(this.options._const.route, route)
                    .setValue(this.options._const.oldValue, t1.data)
                    .setValue(this.options._const.newValue, t2.data)
                ]
            }

        }

        attr1 = t1.attributes ? Object.keys(t1.attributes).sort() : []
        attr2 = t2.attributes ? Object.keys(t2.attributes).sort() : []

        attrLength = attr1.length
        for (i = 0; i < attrLength; i++) {
            attr = attr1[i]
            pos = attr2.indexOf(attr)
            if (pos === -1) {
                diffs.push(new Diff()
                    .setValue(this.options._const.action, this.options._const.removeAttribute)
                    .setValue(this.options._const.route, route)
                    .setValue(this.options._const.name, attr)
                    .setValue(this.options._const.value, t1.attributes[attr])
                )
            } else {
                attr2.splice(pos, 1)
                if (t1.attributes[attr] !== t2.attributes[attr]) {
                    diffs.push(new Diff()
                        .setValue(this.options._const.action, this.options._const.modifyAttribute)
                        .setValue(this.options._const.route, route)
                        .setValue(this.options._const.name, attr)
                        .setValue(this.options._const.oldValue, t1.attributes[attr])
                        .setValue(this.options._const.newValue, t2.attributes[attr])
                    )
                }
            }
        }

        attrLength = attr2.length
        for (i = 0; i < attrLength; i++) {
            attr = attr2[i]
            diffs.push(new Diff()
                .setValue(this.options._const.action, this.options._const.addAttribute)
                .setValue(this.options._const.route, route)
                .setValue(this.options._const.name, attr)
                .setValue(this.options._const.value, t2.attributes[attr])
            )
        }

        return diffs
    }

    findInnerDiff(t1, t2, route) {
        const t1ChildNodes = t1.childNodes ? t1.childNodes.slice() : []
        const t2ChildNodes = t2.childNodes ? t2.childNodes.slice() : []
        const last = Math.max(t1ChildNodes.length, t2ChildNodes.length)
        let childNodesLengthDifference = Math.abs(t1ChildNodes.length - t2ChildNodes.length)
        let diffs = []
        let index = 0
        if (!this.options.maxChildCount || last < this.options.maxChildCount) {
            const cachedSubtrees = t1.subsets && t1.subsetsAge--
            const subtrees = cachedSubtrees ? t1.subsets : (t1.childNodes && t2.childNodes) ? markSubTrees(t1, t2) : []
            if (subtrees.length > 0) {
                /* One or more groups have been identified among the childnodes of t1
                 * and t2.
                 */
                diffs = this.attemptGroupRelocation(t1, t2, subtrees, route, cachedSubtrees)
                if (diffs.length > 0) {
                    return diffs
                }
            }
        }


        /* 0 or 1 groups of similar child nodes have been found
         * for t1 and t2. 1 If there is 1, it could be a sign that the
         * contents are the same. When the number of groups is below 2,
         * t1 and t2 are made to have the same length and each of the
         * pairs of child nodes are diffed.
         */

        for (let i = 0; i < last; i += 1) {
            const e1 = t1ChildNodes[i]
            const e2 = t2ChildNodes[i]

            if (childNodesLengthDifference) {
                /* t1 and t2 have different amounts of childNodes. Add
                 * and remove as necessary to obtain the same length */
                if (e1 && !e2) {
                    if (e1.nodeName === '#text') {
                        diffs.push(new Diff()
                            .setValue(this.options._const.action, this.options._const.removeTextElement)
                            .setValue(this.options._const.route, route.concat(index))
                            .setValue(this.options._const.value, e1.data)
                        )
                        index -= 1
                    } else {
                        diffs.push(new Diff()
                            .setValue(this.options._const.action, this.options._const.removeElement)
                            .setValue(this.options._const.route, route.concat(index))
                            .setValue(this.options._const.element, cloneObj(e1))
                        )
                        index -= 1
                    }

                } else if (e2 && !e1) {
                    if (e2.nodeName === '#text') {
                        diffs.push(new Diff()
                            .setValue(this.options._const.action, this.options._const.addTextElement)
                            .setValue(this.options._const.route, route.concat(index))
                            .setValue(this.options._const.value, e2.data)
                        )
                    } else {
                        diffs.push(new Diff()
                            .setValue(this.options._const.action, this.options._const.addElement)
                            .setValue(this.options._const.route, route.concat(index))
                            .setValue(this.options._const.element, cloneObj(e2))
                        )
                    }
                }
            }
            /* We are now guaranteed that childNodes e1 and e2 exist,
             * and that they can be diffed.
             */
            /* Diffs in child nodes should not affect the parent node,
             * so we let these diffs be submitted together with other
             * diffs.
             */

            if (e1 && e2) {
                if (!this.options.maxChildCount || last < this.options.maxChildCount) {
                    diffs = diffs.concat(this.findNextDiff(e1, e2, route.concat(index)))
                } else if (!isEqual(e1, e2)) {
                    if (t1ChildNodes.length > t2ChildNodes.length) {
                        if (e1.nodeName === '#text') {
                            diffs.push(new Diff()
                                .setValue(this.options._const.action, this.options._const.removeTextElement)
                                .setValue(this.options._const.route, route.concat(index))
                                .setValue(this.options._const.value, e1.data)
                            )
                        } else {
                            diffs.push(
                                new Diff()
                                    .setValue(this.options._const.action, this.options._const.removeElement)
                                    .setValue(this.options._const.element, cloneObj(e1))
                                    .setValue(this.options._const.route, route.concat(index))
                            )
                        }
                        t1ChildNodes.splice(i, 1)
                        i -= 1
                        index -= 1

                        childNodesLengthDifference -= 1
                    } else if (t1ChildNodes.length < t2ChildNodes.length) {
                        diffs = diffs.concat([
                            new Diff()
                                .setValue(this.options._const.action, this.options._const.addElement)
                                .setValue(this.options._const.element, cloneObj(e2))
                                .setValue(this.options._const.route, route.concat(index))
                        ])
                        t1ChildNodes.splice(i, 0, {})
                        childNodesLengthDifference -= 1
                    } else {
                        diffs = diffs.concat([
                            new Diff()
                                .setValue(this.options._const.action, this.options._const.replaceElement)
                                .setValue(this.options._const.oldValue, cloneObj(e1))
                                .setValue(this.options._const.newValue, cloneObj(e2))
                                .setValue(this.options._const.route, route.concat(index))
                        ])
                    }

                }

            }
            index += 1

        }
        t1.innerDone = true
        return diffs
    }

    attemptGroupRelocation(t1, t2, subtrees, route, cachedSubtrees) {
        /* Either t1.childNodes and t2.childNodes have the same length, or
         * there are at least two groups of similar elements can be found.
         * attempts are made at equalizing t1 with t2. First all initial
         * elements with no group affiliation (gaps=true) are removed (if
         * only in t1) or added (if only in t2). Then the creation of a group
         * relocation diff is attempted.
         */
        const gapInformation = getGapInformation(t1, t2, subtrees)
        const gaps1 = gapInformation.gaps1
        const gaps2 = gapInformation.gaps2
        let shortest = Math.min(gaps1.length, gaps2.length)
        let destinationDifferent
        let toGroup
        let group
        let node
        let similarNode
        let testI
        const diffs = []

        for (let index2 = 0, index1 = 0; index2 < shortest; index1 += 1, index2 += 1) {
            if (cachedSubtrees && (gaps1[index2] === true || gaps2[index2] === true)) {
                // pass
            } else if (gaps1[index2] === true) {
                node = t1.childNodes[index1]
                if (node.nodeName === '#text') {
                    if (t2.childNodes[index2].nodeName === '#text') {
                        if (node.data !== t2.childNodes[index2].data) {
                            testI = index1
                            while (t1.childNodes.length > testI + 1 && t1.childNodes[testI + 1].nodeName === '#text') {
                                testI += 1
                                if (t2.childNodes[index2].data === t1.childNodes[testI].data) {
                                    similarNode = true
                                    break
                                }
                            }
                            if (!similarNode) {
                                diffs.push(new Diff()
                                    .setValue(this.options._const.action, this.options._const.modifyTextElement)
                                    .setValue(this.options._const.route, route.concat(index2))
                                    .setValue(this.options._const.oldValue, node.data)
                                    .setValue(this.options._const.newValue, t2.childNodes[index2].data)
                                )
                                return diffs
                            }
                        }
                    } else {
                        diffs.push(new Diff()
                            .setValue(this.options._const.action, this.options._const.removeTextElement)
                            .setValue(this.options._const.route, route.concat(index2))
                            .setValue(this.options._const.value, node.data)
                        )
                        gaps1.splice(index2, 1)
                        shortest = Math.min(gaps1.length, gaps2.length)
                        index2 -= 1
                    }
                } else {
                    diffs.push(new Diff()
                        .setValue(this.options._const.action, this.options._const.removeElement)
                        .setValue(this.options._const.route, route.concat(index2))
                        .setValue(this.options._const.element, cloneObj(node))
                    )
                    gaps1.splice(index2, 1)
                    shortest = Math.min(gaps1.length, gaps2.length)
                    index2 -= 1
                }

            } else if (gaps2[index2] === true) {
                node = t2.childNodes[index2]
                if (node.nodeName === '#text') {
                    diffs.push(new Diff()
                        .setValue(this.options._const.action, this.options._const.addTextElement)
                        .setValue(this.options._const.route, route.concat(index2))
                        .setValue(this.options._const.value, node.data)
                    )
                    gaps1.splice(index2, 0, true)
                    shortest = Math.min(gaps1.length, gaps2.length)
                    index1 -= 1
                } else {
                    diffs.push(new Diff()
                        .setValue(this.options._const.action, this.options._const.addElement)
                        .setValue(this.options._const.route, route.concat(index2))
                        .setValue(this.options._const.element, cloneObj(node))
                    )
                    gaps1.splice(index2, 0, true)
                    shortest = Math.min(gaps1.length, gaps2.length)
                    index1 -= 1
                }

            } else if (gaps1[index2] !== gaps2[index2]) {
                if (diffs.length > 0) {
                    return diffs
                }
                // group relocation
                group = subtrees[gaps1[index2]]
                toGroup = Math.min(group.newValue, (t1.childNodes.length - group.length))
                if (toGroup !== group.oldValue) {
                    // Check whether destination nodes are different than originating ones.
                    destinationDifferent = false
                    for (let j = 0; j < group.length; j += 1) {
                        if (!roughlyEqual(t1.childNodes[toGroup + j], t1.childNodes[group.oldValue + j], [], false, true)) {
                            destinationDifferent = true
                        }
                    }
                    if (destinationDifferent) {
                        return [new Diff()
                            .setValue(this.options._const.action, this.options._const.relocateGroup)
                            .setValue('groupLength', group.length)
                            .setValue(this.options._const.from, group.oldValue)
                            .setValue(this.options._const.to, toGroup)
                            .setValue(this.options._const.route, route)
                        ]
                    }
                }
            }
        }
        return diffs
    }

    findValueDiff(t1, t2, route) {
        // Differences of value. Only useful if the value/selection/checked value
        // differs from what is represented in the DOM. For example in the case
        // of filled out forms, etc.
        const diffs = []

        if (t1.selected !== t2.selected) {
            diffs.push(new Diff()
                .setValue(this.options._const.action, this.options._const.modifySelected)
                .setValue(this.options._const.oldValue, t1.selected)
                .setValue(this.options._const.newValue, t2.selected)
                .setValue(this.options._const.route, route)
            )
        }

        if ((t1.value || t2.value) && t1.value !== t2.value && t1.nodeName !== 'OPTION') {
            diffs.push(new Diff()
                .setValue(this.options._const.action, this.options._const.modifyValue)
                .setValue(this.options._const.oldValue, t1.value || "")
                .setValue(this.options._const.newValue, t2.value || "")
                .setValue(this.options._const.route, route)
            )
        }
        if (t1.checked !== t2.checked) {
            diffs.push(new Diff()
                .setValue(this.options._const.action, this.options._const.modifyChecked)
                .setValue(this.options._const.oldValue, t1.checked)
                .setValue(this.options._const.newValue, t2.checked)
                .setValue(this.options._const.route, route)
            )
        }

        return diffs
    }

}
