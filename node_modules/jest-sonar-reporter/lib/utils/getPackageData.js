'use strict'

const path = require('path')

module.exports = root => require(path.join(root, 'package.json'))
