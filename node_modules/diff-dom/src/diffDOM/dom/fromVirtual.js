export function objToNode(objNode, insideSvg, options) {
    let node
    if (objNode.nodeName === '#text') {
        node = options.document.createTextNode(objNode.data)

    } else if (objNode.nodeName === '#comment') {
        node = options.document.createComment(objNode.data)
    } else {
        if (insideSvg) {
            node = options.document.createElementNS('http://www.w3.org/2000/svg', objNode.nodeName)
        } else if (objNode.nodeName.toLowerCase() === 'svg') {
            node = options.document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            insideSvg = true
        } else {
            node = options.document.createElement(objNode.nodeName)
        }
        if (objNode.attributes) {
            Object.entries(objNode.attributes).forEach(([key, value]) => node.setAttribute(key, value))
        }
        if (objNode.childNodes) {
            objNode.childNodes.forEach(childNode => node.appendChild(objToNode(childNode, insideSvg, options)))
        }
        if (options.valueDiffing) {
            if (objNode.value) {
                node.value = objNode.value
            }
            if (objNode.checked) {
                node.checked = objNode.checked
            }
            if (objNode.selected) {
                node.selected = objNode.selected
            }
        }
    }
    return node
}
