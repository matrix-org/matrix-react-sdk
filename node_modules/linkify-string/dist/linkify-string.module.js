import { Options, tokenize } from 'linkifyjs';

/**
	Convert strings of text into linkable HTML text
*/

function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(href) {
  return href.replace(/"/g, '&quot;');
}

function attributesToString(attributes) {
  var result = [];

  for (var attr in attributes) {
    var val = attributes[attr] + '';
    result.push(attr + "=\"" + escapeAttr(val) + "\"");
  }

  return result.join(' ');
}

function defaultRender(_ref) {
  var tagName = _ref.tagName,
      attributes = _ref.attributes,
      content = _ref.content;
  return "<" + tagName + " " + attributesToString(attributes) + ">" + escapeText(content) + "</" + tagName + ">";
}
/**
 * Convert a plan text string to an HTML string with links. Expects that the
 * given strings does not contain any HTML entities. Use the linkify-html
 * interface if you need to parse HTML entities.
 *
 * @param {string} str string to linkify
 * @param {import('linkifyjs').Opts} [opts] overridable options
 * @returns {string}
 */


function linkifyStr(str, opts) {
  if (opts === void 0) {
    opts = {};
  }

  opts = new Options(opts, defaultRender);
  var tokens = tokenize(str);
  var result = [];

  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (token.t === 'nl' && opts.get('nl2br')) {
      result.push('<br>\n');
    } else if (!token.isLink || !opts.check(token)) {
      result.push(escapeText(token.toString()));
    } else {
      result.push(opts.render(token));
    }
  }

  return result.join('');
}

if (!String.prototype.linkify) {
  Object.defineProperty(String.prototype, 'linkify', {
    writable: false,
    value: function linkify(options) {
      return linkifyStr(this, options);
    }
  });
}

export { linkifyStr as default };
