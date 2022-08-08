#!/usr/bin/env node

const fs = await import('fs');
const url = await import('url');
const path = await import('path');
const { formatHelp } = await import('../dist/help.js');

async function updateReadmeCommands(cwd = process.cwd()) {
  let readmePath = path.join(cwd, 'README.md');
  let pkgPath = path.join(cwd, 'package.json');
  let sections = [];
  let toc = [];

  let pkg = JSON.parse(fs.readFileSync(pkgPath));
  if (!pkg['@percy/cli']?.commands) return '';

  for (let cmdPath of pkg['@percy/cli'].commands) {
    let cmdURL = url.pathToFileURL(path.join(cwd, cmdPath));
    let { default: command } = await import(cmdURL.href);
    command = { ...command, parent: { name: 'percy' } };

    for (let cmd of [command, ...(command.definition.commands || [])]) {
      if (!cmd.callback) continue;
      if (cmd !== command) cmd = { ...cmd, parent: command };
      if (cmd.parent.parent) cmd.name = `${cmd.parent.name}:${cmd.name}`;

      let title = `\`percy ${cmd.name}\``;
      let slug = title.slice(1, -1).replace(/\s/g, '-').replace(/:/g, '');
      toc.push(`* [${title}](#${slug})`);

      let help = await formatHelp(cmd);
      help = help.replace(/^(.*)?(usage:.*)$/gis, '$1```\n$2```');
      sections.push(`### ${title}\n\n${help}\n`);
    }
  }

  fs.writeFileSync(readmePath, fs.readFileSync(readmePath, 'utf-8').replace(
    /(<!-- commands -->)(.*)(<!-- commandsstop -->)/is,
    `$1\n${[toc.join('\n'), sections.join('\n')].join('\n\n')}$3`
  ));
}

updateReadmeCommands();
