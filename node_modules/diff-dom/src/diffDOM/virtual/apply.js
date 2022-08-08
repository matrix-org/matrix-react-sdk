import {cloneObj} from "./helpers"

// ===== Apply a virtual diff =====

function getFromVirtualRoute(tree, route) {
    let node = tree
    let parentNode
    let nodeIndex

    route = route.slice()
    while (route.length > 0) {
        if (!node.childNodes) {
            return false
        }
        nodeIndex = route.splice(0, 1)[0]
        parentNode = node
        node = node.childNodes[nodeIndex]
    }
    return {
        node,
        parentNode,
        nodeIndex
    }
}

function applyVirtualDiff(
        tree,
        diff,
        options // {preVirtualDiffApply, postVirtualDiffApply, _const}
    ) {
    const routeInfo = getFromVirtualRoute(tree, diff[options._const.route])
    let node = routeInfo.node
    const parentNode = routeInfo.parentNode
    const nodeIndex = routeInfo.nodeIndex
    const newSubsets = []

    // pre-diff hook
    const info = {
        diff,
        node
    }

    if (options.preVirtualDiffApply(info)) {
        return true
    }

    let newNode
    let nodeArray
    let route
    let c
    switch (diff[options._const.action]) {
        case options._const.addAttribute:
            if (!node.attributes) {
                node.attributes = {}
            }

            node.attributes[diff[options._const.name]] = diff[options._const.value]

            if (diff[options._const.name] === 'checked') {
                node.checked = true
            } else if (diff[options._const.name] === 'selected') {
                node.selected = true
            } else if (node.nodeName === 'INPUT' && diff[options._const.name] === 'value') {
                node.value = diff[options._const.value]
            }

            break
        case options._const.modifyAttribute:
            node.attributes[diff[options._const.name]] = diff[options._const.newValue]
            break
        case options._const.removeAttribute:

            delete node.attributes[diff[options._const.name]]

            if (Object.keys(node.attributes).length === 0) {
                delete node.attributes
            }

            if (diff[options._const.name] === 'checked') {
                node.checked = false
            } else if (diff[options._const.name] === 'selected') {
                delete node.selected
            } else if (node.nodeName === 'INPUT' && diff[options._const.name] === 'value') {
                delete node.value
            }

            break
        case options._const.modifyTextElement:
            node.data = diff[options._const.newValue]
            break
        case options._const.modifyValue:
            node.value = diff[options._const.newValue]
            break
        case options._const.modifyComment:
            node.data = diff[options._const.newValue]
            break
        case options._const.modifyChecked:
            node.checked = diff[options._const.newValue]
            break
        case options._const.modifySelected:
            node.selected = diff[options._const.newValue]
            break
        case options._const.replaceElement:
            newNode = cloneObj(diff[options._const.newValue])
            newNode.outerDone = true
            newNode.innerDone = true
            newNode.valueDone = true
            parentNode.childNodes[nodeIndex] = newNode
            break
        case options._const.relocateGroup:
            nodeArray = node.childNodes.splice(diff[options._const.from], diff.groupLength).reverse()
            nodeArray.forEach(movedNode => node.childNodes.splice(diff[options._const.to], 0, movedNode))
            if (node.subsets) {
                node.subsets.forEach(map => {
                    if (diff[options._const.from] < diff[options._const.to] && map.oldValue <= diff[options._const.to] && map.oldValue > diff[options._const.from]) {
                        map.oldValue -= diff.groupLength
                        const splitLength = map.oldValue + map.length - diff[options._const.to]
                        if (splitLength > 0) {
                            // new insertion splits map.
                            newSubsets.push({
                                oldValue: diff[options._const.to] + diff.groupLength,
                                newValue: map.newValue + map.length - splitLength,
                                length: splitLength
                            })
                            map.length -= splitLength
                        }
                    } else if (diff[options._const.from] > diff[options._const.to] && map.oldValue > diff[options._const.to] && map.oldValue < diff[options._const.from]) {
                        map.oldValue += diff.groupLength
                        const splitLength = map.oldValue + map.length - diff[options._const.to]
                        if (splitLength > 0) {
                            // new insertion splits map.
                            newSubsets.push({
                                oldValue: diff[options._const.to] + diff.groupLength,
                                newValue: map.newValue + map.length - splitLength,
                                length: splitLength
                            })
                            map.length -= splitLength
                        }
                    } else if (map.oldValue === diff[options._const.from]) {
                        map.oldValue = diff[options._const.to]
                    }
                })
            }

            break
        case options._const.removeElement:
            parentNode.childNodes.splice(nodeIndex, 1)
            if (parentNode.subsets) {
                parentNode.subsets.forEach(map => {
                    if (map.oldValue > nodeIndex) {
                        map.oldValue -= 1
                    } else if (map.oldValue === nodeIndex) {
                        map.delete = true
                    } else if (map.oldValue < nodeIndex && (map.oldValue + map.length) > nodeIndex) {
                        if (map.oldValue + map.length - 1 === nodeIndex) {
                            map.length--
                        } else {
                            newSubsets.push({
                                newValue: map.newValue + nodeIndex - map.oldValue,
                                oldValue: nodeIndex,
                                length: map.length - nodeIndex + map.oldValue - 1
                            })
                            map.length = nodeIndex - map.oldValue
                        }
                    }
                })
            }
            node = parentNode
            break
        case options._const.addElement:
            route = diff[options._const.route].slice()
            c = route.splice(route.length - 1, 1)[0]
            node = getFromVirtualRoute(tree, route).node
            newNode = cloneObj(diff[options._const.element])
            newNode.outerDone = true
            newNode.innerDone = true
            newNode.valueDone = true

            if (!node.childNodes) {
                node.childNodes = []
            }

            if (c >= node.childNodes.length) {
                node.childNodes.push(newNode)
            } else {
                node.childNodes.splice(c, 0, newNode)
            }
            if (node.subsets) {
                node.subsets.forEach(map => {
                    if (map.oldValue >= c) {
                        map.oldValue += 1
                    } else if (map.oldValue < c && (map.oldValue + map.length) > c) {
                        const splitLength = map.oldValue + map.length - c
                        newSubsets.push({
                            newValue: map.newValue + map.length - splitLength,
                            oldValue: c + 1,
                            length: splitLength
                        })
                        map.length -= splitLength
                    }
                })
            }
            break
        case options._const.removeTextElement:
            parentNode.childNodes.splice(nodeIndex, 1)
            if (parentNode.nodeName === 'TEXTAREA') {
                delete parentNode.value
            }
            if (parentNode.subsets) {
                parentNode.subsets.forEach(map => {
                    if (map.oldValue > nodeIndex) {
                        map.oldValue -= 1
                    } else if (map.oldValue === nodeIndex) {
                        map.delete = true
                    } else if (map.oldValue < nodeIndex && (map.oldValue + map.length) > nodeIndex) {
                        if (map.oldValue + map.length - 1 === nodeIndex) {
                            map.length--
                        } else {
                            newSubsets.push({
                                newValue: map.newValue + nodeIndex - map.oldValue,
                                oldValue: nodeIndex,
                                length: map.length - nodeIndex + map.oldValue - 1
                            })
                            map.length = nodeIndex - map.oldValue
                        }
                    }
                })
            }
            node = parentNode
            break
        case options._const.addTextElement:
            route = diff[options._const.route].slice()
            c = route.splice(route.length - 1, 1)[0]
            newNode = {}
            newNode.nodeName = '#text'
            newNode.data = diff[options._const.value]
            node = getFromVirtualRoute(tree, route).node
            if (!node.childNodes) {
                node.childNodes = []
            }

            if (c >= node.childNodes.length) {
                node.childNodes.push(newNode)
            } else {
                node.childNodes.splice(c, 0, newNode)
            }
            if (node.nodeName === 'TEXTAREA') {
                node.value = diff[options._const.newValue]
            }
            if (node.subsets) {
                node.subsets.forEach(map => {
                    if (map.oldValue >= c) {
                        map.oldValue += 1
                    }
                    if (map.oldValue < c && (map.oldValue + map.length) > c) {
                        const splitLength = map.oldValue + map.length - c
                        newSubsets.push({
                            newValue: map.newValue + map.length - splitLength,
                            oldValue: c + 1,
                            length: splitLength
                        })
                        map.length -= splitLength
                    }
                })
            }
            break
        default:
            console.log('unknown action')
    }

    if (node.subsets) {
        node.subsets = node.subsets.filter(map => !map.delete && map.oldValue !== map.newValue)
        if (newSubsets.length) {
            node.subsets = node.subsets.concat(newSubsets)
        }
    }

    // capture newNode for the callback
    info.newNode = newNode
    options.postVirtualDiffApply(info)

    return
}

export function applyVirtual(tree, diffs, options) {
    diffs.forEach(diff => {
        applyVirtualDiff(tree, diff, options)
    })
    return true
}
