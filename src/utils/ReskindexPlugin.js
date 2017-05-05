var fs = require('fs');
var path = require('path');
var glob = require('glob');

function ReskindexPlugin(header) {
    console.log('Resk index plugin creteated');
    this._header = header;
};

var prevFiles = null;

ReskindexPlugin.prototype._reskin = function() {
    var componentsDir = path.join('src', 'components');
    var files = glob.sync('**/*.js', {cwd: componentsDir}).sort();

    // Do not index again if the files being indexed have not changed
    if (prevFiles && files.join('') === prevFiles) {
        console.log("Not indexing");
        return;
    }
    prevFiles = files.join('');

    var componentIndex = path.join('src', 'component-index.js');

    var packageJson = JSON.parse(fs.readFileSync('./package.json'));

    var strm = fs.createWriteStream(componentIndex);

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

    for (var i = 0; i < files.length; ++i) {
        var file = files[i].replace('.js', '');

        var moduleName = (file.replace(/\//g, '.'));
        var importName = moduleName.replace(/\./g, "$");

        strm.write("import " + importName + " from './components/" + file + "';\n");
        strm.write(importName + " && (module.exports.components['"+moduleName+"'] = " + importName + ");");
        strm.write('\n');
        strm.uncork();
    }

    strm.end();

    console.log('Reskindex Complete');
}

ReskindexPlugin.prototype.apply = function(compiler) {
    var self = this;
    compiler.plugin("watch-run", function(compilation, callback) {
        self._reskin();
        callback();
    });
}

module.exports = ReskindexPlugin;
