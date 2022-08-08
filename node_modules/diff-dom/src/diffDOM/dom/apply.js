import {objToNode} from "./fromVirtual"

// ===== Apply a diff =====

function getFromRoute(node, route) {
    route = route.slice()
    while (route.length > 0) {
        if (!node.childNodes) {
            return false
        }
        const c = route.splice(0, 1)[0]
        node = node.childNodes[c]
    }
    return node
}

export function applyDiff(
        tree,
        diff,
        options // {preDiffApply, postDiffApply, textDiff, valueDiffing, _const}
    ) {
    let node = getFromRoute(tree, diff[options._const.route])
    let newNode
    let reference
    let route
    let nodeArray
    let c

    // pre-diff hook
    const info = {
        diff,
        node
    }

    if (options.preDiffApply(info)) {
        return true
    }

    switch (diff[options._const.action]) {
        case options._const.addAttribute:
            if (!node || !node.setAttribute) {
                return false
            }
            node.setAttribute(diff[options._const.name], diff[options._const.value])
            break
        case options._const.modifyAttribute:
            if (!node || !node.setAttribute) {
                return false
            }
            node.setAttribute(diff[options._const.name], diff[options._const.newValue])
            if (node.nodeName === 'INPUT' && diff[options._const.name] === 'value') {
                node.value = diff[options._const.newValue]
            }
            break
        case options._const.removeAttribute:
            if (!node || !node.removeAttribute) {
                return false
            }
            node.removeAttribute(diff[options._const.name])
            break
        case options._const.modifyTextElement:
            if (!node || node.nodeType !== 3) {
                return false
            }
            options.textDiff(node, node.data, diff[options._const.oldValue], diff[options._const.newValue])
            break
        case options._const.modifyValue:
            if (!node || typeof node.value === 'undefined') {
                return false
            }
            node.value = diff[options._const.newValue]
            break
        case options._const.modifyComment:
            if (!node || typeof node.data === 'undefined') {
                return false
            }
            options.textDiff(node, node.data, diff[options._const.oldValue], diff[options._const.newValue])
            break
        case options._const.modifyChecked:
            if (!node || typeof node.checked === 'undefined') {
                return false
            }
            node.checked = diff[options._const.newValue]
            break
        case options._const.modifySelected:
            if (!node || typeof node.selected === 'undefined') {
                return false
            }
            node.selected = diff[options._const.newValue]
            break
        case options._const.replaceElement:
            node.parentNode.replaceChild(
                objToNode(
                    diff[options._const.newValue],
                    node.namespaceURI === 'http://www.w3.org/2000/svg',
                    options
                ),
                node
            )
            break
        case options._const.relocateGroup:
            nodeArray = Array(...new Array(diff.groupLength)).map(() => node.removeChild(node.childNodes[diff[options._const.from]]))
            nodeArray.forEach((childNode, index) => {
                if (index === 0) {
                    reference = node.childNodes[diff[options._const.to]]
                }
                node.insertBefore(childNode, reference || null)
            })
            break
        case options._const.removeElement:
            node.parentNode.removeChild(node)
            break
        case options._const.addElement:
            route = diff[options._const.route].slice()
            c = route.splice(route.length - 1, 1)[0]
            node = getFromRoute(tree, route)
            node.insertBefore(
                objToNode(
                    diff[options._const.element],
                    node.namespaceURI === 'http://www.w3.org/2000/svg',
                    options
                ),
                node.childNodes[c] || null
            )
            break
        case options._const.removeTextElement:
            if (!node || node.nodeType !== 3) {
                return false
            }
            node.parentNode.removeChild(node)
            break
        case options._const.addTextElement:
            route = diff[options._const.route].slice()
            c = route.splice(route.length - 1, 1)[0]
            newNode = options.document.createTextNode(diff[options._const.value])
            node = getFromRoute(tree, route)
            if (!node || !node.childNodes) {
                return false
            }
            node.insertBefore(newNode, node.childNodes[c] || null)
            break
        default:
            console.log('unknown action')
    }

    // if a new node was created, we might be interested in its
    // post diff hook
    info.newNode = newNode
    options.postDiffApply(info)

    return true
}

export function applyDOM(tree, diffs, options) {
    return diffs.every(diff => applyDiff(tree, diff, options))
}
