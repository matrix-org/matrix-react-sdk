import logger from '@percy/logger';
import { camelcase } from '@percy/config/utils';
import { flagUsage } from './help.js'; // Make it possible to identify parse errors.

export class ParseError extends Error {
  name = this.constructor.name;
} // Helper that makes it possible to throw parse errors without throw or new keywords.

function parseError(msg) {
  throw new ParseError(msg);
} // Helper to identify a potential command-line option as a flag.


function isFlag(option) {
  // not a flag if it doesn't start with a dash
  if (!option.startsWith('-')) return false; // safe to say it's a flag without a space

  if (!option.includes(' ')) return true; // containing a space with no operator is not a proper flag

  if (!option.includes('=')) return false; // as long as the operator precedes the space, it is a flag

  return option.indexOf('=') < option.indexOf(' ');
} // Parses input to identify a command. Consumes input and adds to parsed output as needed, returning
// true if any defined command was found. A command is only identified via leading unparsed input
// options. If a command is found, parsed output is updated accordingly and the current input option
// is removed from further processing. An implicit help command is also supported.


async function maybeParseCommand(input, parsed) {
  var _input$;

  // a flag, no defined commands, or already parsed other options
  if (isFlag(input[0]) || !parsed.command.definition.commands || parsed.operators.size || parsed.argv.length) {
    return;
  } // implicit help


  if (input[0] === 'help') {
    parsed.help = true;
    input.shift();
  } // nested commands can be a single argument with command names separated by colons (:)


  let names = ((_input$ = input[0]) === null || _input$ === void 0 ? void 0 : _input$.split(':')) ?? [];
  let command;

  for (let name of names) {
    var _parent$definition$co;

    let parent = command || parsed.command; // find any nested command by name

    command = (_parent$definition$co = parent.definition.commands) === null || _parent$definition$co === void 0 ? void 0 : _parent$definition$co.find(cmd => cmd.name === name);
    if (!command) break; // maintain nested names and parent relationships

    name = parent.parent ? `${parent.name}:${command.name}` : command.name;
    command = await normalizeCommand(command, {
      name,
      parent
    });
  }

  if (command) {
    // update parsed properties and discard current input
    parsed.log = logger(`cli:${command.name}`);
    parsed.command = command;
    input.shift();
  } // help was requested, drain remaining input


  if (parsed.help) {
    input.splice(0, input.length);
  }

  return parsed.help || !!command;
} // Parses input to identify a flag option. Consumes input and adds to parsed output as needed,
// returning true if any defined flag was found. If a found flag is missing a required argument, the
// next input option will be consumed as that argument. Boolean flags support negation if their
// default value is true, integer flags are automatically parsed, and flags that can be provided
// multiple times will be concatenated together. Implicit help and version flags are also supported.


async function maybeParseFlag(input, parsed) {
  var _value;

  if (!isFlag(input[0])) return; // end of options and arguments, consume remaining input

  if (input[0] === '--') {
    let [, ...argv] = input.splice(0, input.length);
    parsed.argv.push(...argv);
    return true;
  } // a short flag was provided


  let short = input[0][1] !== '-' && input[0][1]; // get any value set with `=` and remove any `=` from short values

  let [name, value] = short ? ['', input[0].substr(2) || null] : input[0].split('=');
  value = short && (_value = value) !== null && _value !== void 0 && _value.startsWith('=') ? value.substr(1) : value; // the flag was negated

  let negated = name.startsWith('--no-');
  name = name.replace(/^--(no-)?/, ''); // search for the provided short or long flag

  let flag = parsed.command.definition.flags.find(f => {
    return short ? f.short === short : f.name === name;
  });

  if (flag) {
    // discard current input
    input.shift();

    if (!flag.type || flag.type === 'boolean') {
      // short boolean flags can be provided with other short flags
      if (short && value) input.unshift(`-${value}`); // a value was provided to a boolean flag

      if (!short && value) {
        parseError(`Unexpected option argument for '${flagUsage(flag)}'`);
      } // a boolean value is based on if it was negated


      value = !negated;
    } else if (value == null) {
      // expected a value for a non-boolean flag
      if (!input.length || isFlag(input[0])) {
        parseError(`Missing option argument for '${flagUsage(flag)}'`);
      } // the value is actually the next input option


      value = input.shift();
    } // parse the value according to flag properties


    if (flag.type === 'integer') value = parseInt(value, 10);
    if (flag.parse) value = await flag.parse(value);

    if (flag.multiple) {
      value = (parsed.operators.get(flag) ?? []).concat(value);
    } // add this flag to the set of parsed operators


    parsed.operators.set(flag, value);
    return true;
  } // implicit version and help support


  if (parsed.command.definition.version && (name === 'version' || short === 'V')) {
    parsed.version = true;
  } else if (name === 'help' || short === 'h') {
    parsed.help = true;
  } // help or version was requested, drain remaining input


  if (parsed.help || parsed.version) {
    input.splice(0, input.length);
    return true;
  }
} // Parses input to identify an argument option. Consumes input and adds to parsed output as needed,
// returning true if any defined argument was found. Arguments are matched according to their
// respective index and command-line position.


async function maybeParseArg(input, parsed) {
  var _parsed$command$defin;

  if (isFlag(input[0])) return; // the argument index needs to be tracked since flag options can precede argument options

  let index = parsed.__args_index__ ?? (parsed.__args_index__ = 0); // there are arguments left to parse

  if (index < ((_parsed$command$defin = parsed.command.definition.args) === null || _parsed$command$defin === void 0 ? void 0 : _parsed$command$defin.length)) {
    parsed.__args_index__ += 1;
    let value = input.shift();
    let arg = parsed.command.definition.args[index];
    if (arg.parse) value = await arg.parse(value); // add this arg to the set of parsed operators

    parsed.operators.set(arg, value);
    return true;
  }
} // Parses input to identify unknown options. Consumes input and adds to parsed output as needed,
// returning true when unknown options are found. By default, unknown options result in an error
// unless the command is defined to accept loose options. If `loose` is a string, it will be logged
// as a warning when unknown options are found. When the first unknown option is found, all
// remaining options are also considered unknown.


async function maybeParseUnknown(input, parsed) {
  let {
    loose
  } = parsed.command.definition;

  if (!loose) {
    // throw a more descriptive error message
    let reason = isFlag(input[0]) ? 'Unknown option' : 'Unexpected argument';
    parseError(`${reason} '${input[0]}'`);
  } else if (typeof loose === 'string') {
    // warn when loose is a string
    parsed.log.warn(loose);
  } // consume all remaining unknown input options


  let unknown = input.splice(0, input.length);
  parsed.argv.push(...unknown);
  return true;
} // Parses an option's value defined by an environment variable. Adds to parsed output as needed,
// returning true when the option's value was parsed from the environment. Boolean environment
// variables will be interpreted as true unless "false" or "0", and integer environment variables
// will be parsed automatically.


async function maybeParseEnv(option, parsed) {
  // no env option, already provided, or no defined env var
  if (!option.env || parsed.operators.has(option) || !(option.env in process.env)) {
    return;
  } // get the value from the process env


  let value = process.env[option.env];
  let flag = parsed.command.definition.flags.includes(option);

  if (flag && (!option.type || option.type === 'boolean')) {
    // parse booleans as not "false" or not "0"
    value = value !== 'false' && value !== '0';
  } else if (option.type === 'integer') {
    // parse integer option values
    value = parseInt(value, 10);
  } // custom parse and add this option to the set of parsed operators


  if (option.parse) value = await option.parse(value);
  parsed.operators.set(option, value);
  return true;
} // Helper to find and return a matching flag by name.


function findFlag(name, parsed, map) {
  if (name.startsWith('--')) name = name.substr(2);
  let {
    flags
  } = parsed.command.definition;
  let match = flags.find(f => f.name === name);
  return map ? map(match) : match;
} // Throws an error if the provided flag is inclusive of any missing flags.


function validateInclusiveFlag(flag, parsed) {
  if (!flag.inclusive) return;
  let invalid = flag.inclusive.reduce((invalid, name) => findFlag(name, parsed, flag => // invalid options are options that have _not_ been provided
  !parsed.operators.has(flag) ? invalid.concat(flag) : invalid), []);

  if (invalid.length) {
    // show full flag usage for invalid options
    invalid = [flag, ...invalid].map(f => flagUsage(f)).join("', '");
    parseError(`Options must be used together: '${invalid}'`);
  }
} // Throws an error if the provided flag is exclusive of other provided flags.


function validateExclusiveFlag(flag, parsed) {
  if (!flag.exclusive) return;
  let invalid = flag.exclusive.reduce((invalid, name) => findFlag(name, parsed, flag => // invalid options are options that _have_ been provided
  parsed.operators.has(flag) ? invalid.concat(flag) : invalid), []);

  if (invalid.length) {
    // show full flag usage for invalid options
    invalid = [flag, ...invalid].map(f => flagUsage(f)).join("', '");
    parseError(`Options cannot be used together: '${invalid}'`);
  }
} // Returns the attribute name of an option, which may be contingent on it's parsed value. If an
// option is deprecated and is recommended to be replaced with flag, the attribute name will be
// mapped to the replacement flag's attribute name. If a deprecated option is found in the provided
// operators, a deprecation warning will be logged with any recommendation message.


function attributeName(option, parsed) {
  let {
    attribute,
    deprecated
  } = option;
  let value = parsed.operators.get(option) ?? option.default; // the option's attribute name might be contingent on it's value

  let name = typeof attribute === 'function' ? attribute(value) : attribute; // default the attribute name to the camelcase name or short character

  name || (name = option.name ? camelcase(option.name) : option.short); // deprecated options can be mapped to other options

  if (deprecated) {
    var _recommend;

    let [until, recommend] = Array.isArray(deprecated) ? deprecated : [typeof deprecated === 'string' ? deprecated : '']; // recommended replacement flag

    if ((_recommend = recommend) !== null && _recommend !== void 0 && _recommend.startsWith('--')) {
      let opt = findFlag(recommend, parsed);
      recommend = opt ? `Use '${flagUsage(opt)}' instead.` : '';
      name = opt ? attributeName(opt, parsed) : name;
    } // operator was provided, log deprecation warning


    if (parsed.operators.has(option)) {
      // show better usage message for flags
      let flag = parsed.command.definition.flags.includes(option);
      let usage = flag ? flagUsage(option) : option.name;
      parsed.log.deprecated((`The '${usage}' ${flag ? 'option' : 'argument'} ` + `will be removed in ${until || 'a future release'}. ` + (recommend || '')).trim());
    }
  }

  return name;
} // Normalizes a command runner into an object of command properties. Optionally derives nested
// commands from any provided definition commands method.


async function normalizeCommand(command, properties) {
  var _ref;

  // shallow copy command definition
  let { ...definition
  } = command.definition; // evaluate commands if needed

  if (typeof definition.commands === 'function') {
    definition.commands = await definition.commands();
  } // create a shallow copy with additional properties


  let normalized = { ...command,
    ...properties,
    definition
  }; // inherit parent package information by default

  normalized.packageInformation || (normalized.packageInformation = (_ref = (properties === null || properties === void 0 ? void 0 : properties.parent) || command.parent) === null || _ref === void 0 ? void 0 : _ref.packageInformation);
  return normalized;
} // Parses and validates command-line arguments according to a command definition.


export async function parse(command, argv) {
  // initial input and output
  let input = argv.slice().filter(a => a != null);
  let parsed = {
    command: await normalizeCommand(command),
    operators: new Map(),
    log: logger('cli'),
    flags: {},
    args: {},
    argv: []
  }; // while there is input left, parse it

  while (input.length) {
    // parse and mutate input and output, looping if an option is found
    if (await maybeParseCommand(input, parsed)) continue;
    if (await maybeParseFlag(input, parsed)) continue;
    if (await maybeParseArg(input, parsed)) continue;
    await maybeParseUnknown(input, parsed);
  } // help or version requested, skip remaining parse logic


  if (parsed.help || parsed.version) {
    return parsed;
  } // validate and map defined flags


  for (let flag of parsed.command.definition.flags) {
    // collect last-minute env info
    await maybeParseEnv(flag, parsed);

    if (parsed.operators.has(flag)) {
      // validate before setting the parsed attribute
      validateInclusiveFlag(flag, parsed);
      validateExclusiveFlag(flag, parsed);
      let value = parsed.operators.get(flag);
      if (flag.validate) await flag.validate(value, parsed);
      parsed.flags[attributeName(flag, parsed)] = value;
    } else if (flag.default != null) {
      // a default value needs to be set, but not parsed
      parsed.flags[attributeName(flag, parsed)] = flag.default;
    }
  } // validate and map defined args


  for (let arg of parsed.command.definition.args ?? []) {
    // collect last-minute env info
    await maybeParseEnv(arg, parsed);

    if (parsed.operators.has(arg)) {
      var _arg$deprecated, _arg$deprecated$;

      // validate before setting the parsed attribute
      let value = parsed.operators.get(arg);
      if (arg.validate) await arg.validate(value, parsed); // a deprecated arg might be mapped to a flag

      if ((_arg$deprecated = arg.deprecated) !== null && _arg$deprecated !== void 0 && (_arg$deprecated$ = _arg$deprecated[1]) !== null && _arg$deprecated$ !== void 0 && _arg$deprecated$.startsWith('--') && findFlag(arg.deprecated[1], parsed)) {
        parsed.flags[attributeName(arg, parsed)] = value;
      } else {
        parsed.args[attributeName(arg, parsed)] = value;
      }
    } else if (arg.required) {
      // a required argument was not provided
      parseError(`Missing required argument '${arg.name}'`);
    } else if (arg.default != null) {
      // a default value needs to be set, but not parsed
      parsed.args[attributeName(arg, parsed)] = arg.default;
    }
  }

  return parsed;
}
export default parse;