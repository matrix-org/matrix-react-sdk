const {
  isArray
} = Array;
const {
  isInteger
} = Number;
const {
  entries
} = Object; // Creates an empty object or array

function create(array) {
  return array ? [] : {};
} // Returns true or false if a subject has iterable keys or not


function hasKeys(subj) {
  return isArray(subj) || Object.getPrototypeOf(subj) === Object.prototype;
} // Returns true if the provided key looks like an array key


const ARRAY_PATH_KEY_REG = /^(\[\d+]|0|[1-9]\d*)$/;
export function isArrayKey(key) {
  return isInteger(key) || ARRAY_PATH_KEY_REG.test(key);
} // Split a property path string by dot or array notation

export function parsePropertyPath(path) {
  return isArray(path) ? path : path.split('.').reduce((full, part) => {
    return full.concat(part.split('[').reduce((f, p) => {
      if (p.endsWith(']')) p = p.slice(0, -1);
      return f.concat(isArrayKey(p) ? parseInt(p, 10) : p || []);
    }, []));
  }, []);
} // Join an array of path parts into a single path string

export function joinPropertyPath(path) {
  path = !Array.isArray(path) ? path : path.filter(Boolean).map(k => isArrayKey(k) ? `[${k}]` : `.${k}`).join('');

  while ((_path = path) !== null && _path !== void 0 && _path.startsWith('.')) {
    var _path;

    path = path.substr(1);
  }

  return path;
} // Gets a value in the object at the path

export function get(object, path, find) {
  return parsePropertyPath(path).reduce((target, key) => target === null || target === void 0 ? void 0 : target[key], object);
} // Sets a value to the object at the path creating any necessary nested
// objects or arrays along the way

export function set(object, path, value) {
  return parsePropertyPath(path).reduce((target, key, index, path) => {
    if (index < path.length - 1) {
      target[key] ?? (target[key] = create(isArrayKey(path[index + 1])));
      return target[key];
    } else {
      target[key] = value;
      return object;
    }
  }, object);
} // Deletes properties from an object at the paths

export function del(object, ...paths) {
  return paths.reduce((object, path) => {
    return parsePropertyPath(path).reduce((target, key, index, path) => {
      if (index < path.length - 1) {
        return target === null || target === void 0 ? void 0 : target[key];
      } else {
        target === null || target === void 0 ? true : delete target[key];
        return object;
      }
    }, object);
  }, object);
} // Maps a value from one path to another, deleting the first path

export function map(object, from, to, transform = v => v) {
  return set(object, to, transform(parsePropertyPath(from).reduce((target, key, index, path) => {
    let value = target === null || target === void 0 ? void 0 : target[key];

    if (index === path.length - 1) {
      target === null || target === void 0 ? true : delete target[key];
    }

    return value;
  }, object)));
} // Steps through an object's properties calling the function with the path and value of each

function walk(object, fn, path = [], visited = new Set()) {
  if (path.length && fn([...path], object) === false) return;
  if (visited.has(object)) return;
  visited.add(object);

  if (object != null && typeof object === 'object') {
    let isArrayObject = isArray(object);

    for (let [key, value] of entries(object)) {
      if (isArrayObject) key = parseInt(key, 10);
      walk(value, fn, [...path, key], new Set(visited));
    }
  }
} // Recursively mutate and filter empty values from arrays and objects


export function filterEmpty(subject) {
  if (typeof subject === 'object') {
    if (isArray(subject)) {
      for (let i = 0; i < subject.length; i++) {
        if (!filterEmpty(subject[i])) {
          subject.splice(i--, 1);
        }
      }

      return subject.length > 0;
    } else {
      for (let k in subject) {
        if (!filterEmpty(subject[k])) {
          delete subject[k];
        }
      }

      return entries(subject).length > 0;
    }
  } else {
    return subject != null;
  }
} // Merges source values and returns a new merged value. The map function will be called with a
// property's path, previous value, and next value; it should return an array containing any
// replacement path and value; when a replacement value not defined, values will be merged.

export function merge(sources, map) {
  return sources.reduce((target, source, i) => {
    let isSourceArray = isArray(source);
    walk(source, (path, value) => {
      var _ctx;

      let ctx = get(target, path.slice(0, -1));
      let key = path[path.length - 1];
      let prev = (_ctx = ctx) === null || _ctx === void 0 ? void 0 : _ctx[key]; // maybe map the property path and/or value

      let [mapped, next] = (map === null || map === void 0 ? void 0 : map(path, prev, value)) || []; // update the context and path if changed

      if (mapped !== null && mapped !== void 0 && mapped.some((m, i) => m !== path[i])) {
        ctx = get(target, mapped.slice(0, -1));
        path = [...mapped];
      } // adjust path to concat array values when necessary


      if (next !== null && (isArray(ctx) || isInteger(key))) {
        var _ctx2;

        path.splice(-1, 1, ((_ctx2 = ctx) === null || _ctx2 === void 0 ? void 0 : _ctx2.length) ?? 0);
      } // delete prev values


      if (next === null || next == null && value === null) {
        del(target, path);
      } // set the next or default value if there is one


      if (next != null || next !== null && value != null && !hasKeys(value)) {
        set(target ?? (target = create(isSourceArray)), path, next ?? value);
      } // do not recurse mapped objects


      return next === undefined;
    });
    return target;
  }, undefined);
}
export default merge;