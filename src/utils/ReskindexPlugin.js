const fs = require('fs');
const path = require('path');
const glob = require('glob');

function ReskindexPlugin(header) {
    console.log('Resk index plugin creteated');
    this._header = header;
};

let prevFiles = null;

ReskindexPlugin.prototype._reskin = function() {
    const componentsDir = path.join('src', 'components');
    const files = glob.sync('**/*.js', {cwd: componentsDir}).sort();

    // Do not index again if the files being indexed have not changed
    if (prevFiles && files.join('') === prevFiles) {
        console.log("Reskindex: Not indexing because file names have not changed");
        return;
    }
    prevFiles = files.join('');

    const packageJson = JSON.parse(fs.readFileSync('./package.json'));

    const strm = fs.createWriteStream(path.join('src', 'component-index.js'));

    const header = this._header;

    if (header) {
       strm.write(fs.readFileSync(header));
       strm.write('\n');
    }

    strm.write("/*\n");
    strm.write(" * THIS FILE IS AUTO-GENERATED\n");
    strm.write(" * You can edit it you like, but your changes will be overwritten,\n");
    strm.write(" * so you'd just be trying to swim upstream like a salmon.\n");
    strm.write(" * You are not a salmon.\n");
    strm.write(" */\n\n");

    if (packageJson['matrix-react-parent']) {
        strm.write("module.exports.components = require('"+packageJson['matrix-react-parent']+"/lib/component-index').components;\n\n");
    } else {
        strm.write("module.exports.components = {};\n");
    }

    for (let i = 0; i < files.length; ++i) {
        const file = files[i].replace('.js', '');

        const moduleName = (file.replace(/\//g, '.'));
        const importName = moduleName.replace(/\./g, "$");

        strm.write("import " + importName + " from './components/" + file + "';\n");
        strm.write(importName + " && (module.exports.components['"+moduleName+"'] = " + importName + ");");
        strm.write('\n');
        strm.uncork();
    }

    strm.end();

    console.log('Reskindex: Completed index');
}

ReskindexPlugin.prototype.apply = function(compiler) {
    compiler.plugin("watch-run", (compilation, callback) => {
        this._reskin();
        callback();
    });
}

module.exports = ReskindexPlugin;
