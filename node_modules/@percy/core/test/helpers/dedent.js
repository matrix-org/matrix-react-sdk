export function dedent(raw, ...values) {
  let result = raw.reduce((acc, str, i) => {
    acc += str.replace(/\\\n[ \t]*/g, '').replace(/\\`/g, '`');
    if (i < values.length) acc += values[i];
    return acc;
  }, '');

  let lines = result.split('\n');
  let mindent;

  for (let l of lines) {
    let m = l.match(/^(\s+)\S+/);

    if (m) {
      let indent = m[1].length;
      mindent = !mindent ? indent : Math.min(mindent, indent);
    }
  }

  if (mindent != null) {
    result = lines.map(l => l[0] === ' ' ? l.slice(mindent) : l).join('\n');
  }

  return result.trim().replace(/\\n/g, '\n');
}

export default dedent;
