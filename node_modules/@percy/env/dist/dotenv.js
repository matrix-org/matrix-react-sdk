import fs from 'fs'; // Heavily inspired by dotenv-rails
// https://github.com/bkeepers/dotenv
// matches each valid line of a dotenv file

const LINE_REG = new RegExp([// key with optional export
'^\\s*(?:export\\s+)?(?<key>[\\w.]+)', // separator
'(?:\\s*=\\s*?|:\\s+?)(?:', // single quoted value or
'\\s*(?<squote>\')(?<sval>(?:\\\\\'|[^\'])*)\'|', // double quoted value or
'\\s*(?<dquote>")(?<dval>(?:\\\\"|[^"])*)"|', // unquoted value
'(?<uval>[^#\\r\\n]+))?', // optional comment
'\\s*(?:#.*)?$'].join(''), 'gm'); // interpolate variable substitutions

const INTERPOLATE_REG = /(.?)(\${?([a-zA-Z0-9_]+)?}?)/g; // expand newlines

const EXPAND_CRLF_REG = /\\(?:(r)|n)/g; // unescape characters

const UNESC_CHAR_REG = /\\([^$])/g;
export function load() {
  // don't load dotenv files when disabled
  if (process.env.PERCY_DISABLE_DOTENV) return;
  let {
    NODE_ENV
  } = process.env; // dotenv filepaths ordered by priority

  let paths = [NODE_ENV && `.env.${NODE_ENV}.local`, NODE_ENV !== 'test' && '.env.local', NODE_ENV && `.env.${NODE_ENV}`, '.env']; // load each dotenv file synchronously

  for (let path of paths) {
    try {
      let src = fs.readFileSync(path, {
        encoding: 'utf-8'
      }); // iterate over each matching line

      for (let {
        groups: match
      } of src.matchAll(LINE_REG)) {
        let value = match.sval ?? match.dval ?? match.uval ?? ''; // if double quoted, expand newlines

        if (match.dquote) {
          value = value.replace(EXPAND_CRLF_REG, (_, r) => r ? '\r' : '\n');
        } // unescape characters


        value = value.replace(UNESC_CHAR_REG, '$1'); // if not single quoted, interpolate substitutions

        if (!match.squote) {
          value = value.replace(INTERPOLATE_REG, (_, pre, ref, key) => {
            if (pre === '\\') return ref; // escaped reference

            return pre + (process.env[key] ?? '');
          });
        } // set process.env if not already


        if (!Object.prototype.hasOwnProperty.call(process.env, match.key)) {
          process.env[match.key] = value;
        }
      }
    } catch (e) {// silent error
    }
  }
}
export * as default from './dotenv.js';