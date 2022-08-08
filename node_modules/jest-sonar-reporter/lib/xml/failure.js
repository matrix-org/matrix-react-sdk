'use strict'

const filter = /([\u001b]\[.{1,2}m)/g
const shorten = /[\n].*/g

module.exports = function failure(message) {
  const filteredMessage = message.replace(filter, '')
  const shortMessage = filteredMessage.replace(shorten, '')

  return {
    failure: {
      _attr: {
        message: shortMessage
      },
      _cdata: filteredMessage
    }
  }
}
