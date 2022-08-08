export function nodeToObj(aNode, options = {}) {
    const objNode = {}
    objNode.nodeName = aNode.nodeName
    if (objNode.nodeName === '#text' || objNode.nodeName === '#comment') {
        objNode.data = aNode.data
    } else {
        if (aNode.attributes && aNode.attributes.length > 0) {
            objNode.attributes = {}
            const nodeArray = Array.prototype.slice.call(aNode.attributes)
            nodeArray.forEach(attribute => objNode.attributes[attribute.name] = attribute.value)
        }
        if (objNode.nodeName === 'TEXTAREA') {
            objNode.value = aNode.value
        } else if (aNode.childNodes && aNode.childNodes.length > 0) {
            objNode.childNodes = []
            const nodeArray = Array.prototype.slice.call(aNode.childNodes)
            nodeArray.forEach(childNode => objNode.childNodes.push(nodeToObj(childNode, options)))
        }
        if (options.valueDiffing) {
            if (aNode.checked !== undefined && aNode.type && ['radio', 'checkbox'].includes(aNode.type.toLowerCase())) {
                objNode.checked = aNode.checked
            } else if (aNode.value !== undefined) {
                objNode.value = aNode.value
            }
            if (aNode.selected !== undefined) {
                objNode.selected = aNode.selected
            }
        }
    }
    return objNode
}
