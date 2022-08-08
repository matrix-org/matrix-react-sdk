module.exports = function (sch) {
  var noComments = function (line) {
    var i = line.indexOf('//')
    return i > -1 ? line.slice(0, i) : line
  }

  var noMultilineComments = function () {
    var inside = false
    return function (token) {
      if (token === '/*') {
        inside = true
        return false
      }
      if (token === '*/') {
        inside = false
        return false
      }
      return !inside
    }
  }

  var trim = function (line) {
    return line.trim()
  }

  var removeQuotedLines = function (list) {
    return function (str) {
      var s = '$' + list.length + '$'
      list.push(str)
      return s
    }
  }

  var restoreQuotedLines = function (list) {
    var re = /^\$(\d+)\$$/
    return function (line) {
      var m = line.match(re)
      return m ? list[+m[1]] : line
    }
  }

  var replacements = []
  return sch
    .replace(/"(\\"|[^"\n])*?"|'(\\'|[^'\n])*?'/gm, removeQuotedLines(replacements))
    .replace(/([;,{}()=:[\]<>]|\/\*|\*\/)/g, ' $1 ')
    .split(/\n/)
    .map(trim)
    .filter(Boolean)
    .map(noComments)
    .map(trim)
    .filter(Boolean)
    .join('\n')
    .split(/\s+|\n+/gm)
    .filter(noMultilineComments())
    .map(restoreQuotedLines(replacements))
}
