import logger from '@percy/logger'; // Helper to return an argument's description including it's default value.

function argumentDescription(arg) {
  let desc = arg.description || '';

  if (arg.default != null) {
    desc += ` (default: ${JSON.stringify(arg.default)})`;
  }

  return desc.trim();
} // Helper to return an array of visible argument usage-description pairs.


async function visibleArguments(command) {
  let args = command.definition.args ?? []; // not hidden and not deprecated

  let visible = args.reduce((visible, arg) => {
    if (arg.hidden || arg.deprecated) return visible;
    visible.push([arg.name, argumentDescription(arg)]);
    return visible;
  }, []); // do not return any arguments if none have descriptions

  if (!visible.some(([, desc]) => !!desc)) return [];
  return visible;
} // Helper to return a command's usage string.


function commandUsage(command) {
  let {
    name,
    definition
  } = command;
  let {
    usage,
    args,
    commands
  } = definition;

  if (!command.callback && commands !== null && commands !== void 0 && commands.length) {
    // if there are subcommands but no callback show subcommand usage
    usage || (usage = '<command>');
  } else {
    var _args, _args2;

    // show options followed by arguments
    args = (_args = args) === null || _args === void 0 ? void 0 : _args.filter(a => !a.hidden && !a.deprecated).map(a => a.required ? `<${a.name}>` : `[${a.name}]`);
    usage || (usage = `[options] ${((_args2 = args) === null || _args2 === void 0 ? void 0 : _args2.join(' ')) || ''}`);
  }

  return `${name} ${usage}`.trim();
} // Helper to return an array of visible command usage-description pairs.


async function visibleCommands(command, help) {
  let commands = command.definition.commands ?? [];
  if (typeof commands === 'function') commands = await commands();
  let visible = [];

  for (let cmd of commands) {
    // create parent references and format subcommand names
    let name = command.parent ? `${command.name}:${cmd.name}` : cmd.name;
    cmd = { ...cmd,
      name,
      parent: command
    }; // commands without callbacks are not visible themselves

    if (cmd.callback) {
      let {
        description
      } = cmd.definition;
      visible.push([commandUsage(cmd), description]);
    } // include visible subcommands without their implicit help


    if (cmd.definition.commands) {
      visible.push(...(await visibleCommands(cmd, false)));
    }
  } // include implicit help if there are visible commands


  if (help !== false && visible.length) {
    visible.push(['help [command]', 'Display command help']);
  }

  return visible;
} // Helper to return an flags's description including it's default value.


function flagDescription(flag) {
  let desc = flag.description || ''; // a boolean that defaults to false will be displayed with a --no prefix

  if (flag.type && flag.type !== 'boolean' && flag.default != null) {
    desc += ` (default: ${JSON.stringify(flag.default)})`;
  }

  return desc.trim();
} // Helper to return a flag's usage string.


export function flagUsage(flag) {
  let {
    short,
    usage,
    type
  } = flag;
  let term = flag.name ? `--${flag.name}` : '';

  if (type && type !== 'boolean') {
    // if there is a default it is not required
    usage || (usage = flag.default != null ? `[${type}]` : `<${type}>`);
  } else if (flag.default === true) {
    // negated booleans have a prefix
    term && (term = `--no-${flag.name}`);
  } // add short flag usage


  if (short) term = `-${short}${term ? `, ${term}` : ''}`;
  return `${term} ${usage || ''}`.trim();
} // Helper to return an array of visible flag usage-description pairs. A third entry is also included
// with the returned pair representing any group the flag should belong to.

async function visibleFlags(command) {
  let flags = command.definition.flags; // not hidden and not deprecated

  let visible = flags.reduce((visible, flag) => {
    if (flag.hidden || flag.deprecated) return visible;
    visible.push([flagUsage(flag), flagDescription(flag), flag.group]);
    return visible;
  }, []); // maybe hide the implicit help long or short flag (or both)

  let showLongHelpFlag = !flags.some(f => f.name === 'help');
  let showShortHelpFlag = !flags.some(f => f.short === 'h');

  if (showLongHelpFlag || showShortHelpFlag) {
    let help = {
      name: 'help',
      short: 'h'
    };
    if (!showLongHelpFlag) delete help.name;
    if (!showShortHelpFlag) delete help.short;
    visible.push([flagUsage(help), 'Display command help', 'Global']);
  }

  if (command.definition.version) {
    // maybe hide the implicit version long or short flag (or both)
    let showLongVerFlag = !flags.some(f => f.name === 'version');
    let showShortVerFlag = !flags.some(f => f.short === 'V');

    if (showLongVerFlag || showShortVerFlag) {
      let ver = {
        name: 'version',
        short: 'V'
      };
      if (!showLongVerFlag) delete ver.name;
      if (!showShortVerFlag) delete ver.short;
      visible.push([flagUsage(ver), 'Display version', 'Global']);
    }
  }

  return visible;
} // Helper to wrap a string at a length by inserting a newline between every segment.


function wrapString(str, len) {
  let regex = new RegExp(`.{1,${len - 1}}(\\s|$)|\\S+?(\\s|$)`, 'g');
  return str.replace(regex, s => s.replace(/\s*\n?$/, str.endsWith(s) ? '' : '\n'));
} // Helper to format an option usage-description pair into a single string where the description
// wraps within the available space beside the usage string.


function formatOptionHelp(option, usageWidth, maxWidth) {
  if (!option[1]) return option[0]; // calculate the available description width, at minimum 40

  let descWidth = Math.max(maxWidth - usageWidth, 40); // pad usage up to the description and indent the description

  return option[0].padEnd(usageWidth) + wrapString(option[1], descWidth).replace(/\n+/gm, `$&${' '.repeat(usageWidth)}`);
} // Returns a formatted string displaying help output for the specified command. The help output
// total width is determined by the logger's stdout TTY columns. Help output includes the command
// description, usage, arguments, subcommand usage and descriptions, flag and flag group usage and
// descriptions, and any command examples.


export async function formatHelp(command) {
  var _examples, _examples2;

  let {
    name,
    parent: top,
    definition
  } = command;
  let {
    description,
    examples
  } = definition;
  let output = []; // collect visible items first to determine max usage width

  let args = await visibleArguments(command);
  let commands = await visibleCommands(command);
  let flags = await visibleFlags(command); // maximum help output total width

  let maxWidth = logger.stdout.columns || 100; // calculate the longest usage width

  let usageWidth = Math.max(args.reduce((max, [usage]) => Math.max(max, usage.length), 0), commands.reduce((max, [usage]) => Math.max(max, usage.length), 0), flags.reduce((max, [usage]) => Math.max(max, usage.length), 0)); // format lists of options and add appropriate indentation

  let formatList = items => items.map(item => Array.isArray(item) ? // indent items and separate columns by 2 spaces each
  formatOptionHelp(item, usageWidth + 2, maxWidth - 2) : item).join('\n').replace(/^(?!$)/gm, ' '.repeat(2)); // format the command name to include the topmost command name


  while ((_top = top) !== null && _top !== void 0 && _top.parent) {
    var _top;

    top = top.parent;
  }

  if (top) name = `${top.name} ${name}`;
  command = { ...command,
    name
  }; // include command description and own usage

  if (description) output.push(wrapString(description, maxWidth), '');
  output.push('Usage:', formatList([`$ ${commandUsage(command)}`]), ''); // include command arguments

  if (args.length) output.push('Arguments:', formatList(args), ''); // include command subcommands

  let commandGroupName = command.parent ? 'Subcommands:' : 'Commands:';
  if (commands.length) output.push(commandGroupName, formatList(commands), ''); // separate flags into groups

  let groups = flags.reduce((all, option) => {
    let group = option[2] ? `${option[2]} options` : 'Options';
    return all.set(group, [...(all.get(group) || []), option]);
  }, new Map([['Options', []]])); // include each group of command flags

  for (let [group, flags] of groups.entries()) {
    if (flags.length) output.push(`${group}:`, formatList(flags), '');
  } // include command examples and replace '$0' with the command name


  examples = (_examples = examples) === null || _examples === void 0 ? void 0 : _examples.map(ex => ex.replace('$0', `$ ${name}`));
  if ((_examples2 = examples) !== null && _examples2 !== void 0 && _examples2.length) output.push('Examples:', formatList(examples), ''); // join each line of output

  return output.join('\n');
}
export default formatHelp;