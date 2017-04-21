var fs = require('fs');
var copy = function(srcDir, dstDir) {
  var results = [];
  var list = fs.readdirSync(srcDir);
  var src, dst;
  list.forEach(function(file) {
    src = srcDir + '/' + file;
    dst = dstDir + '/' + file;
    //console.log(src);
    var stat = fs.statSync(src);
    if (stat && stat.isDirectory()) {
      try {
        console.log('creating dir: ' + dst);
        fs.mkdirSync(dst);
      } catch(e) {
        console.log('directory already exists: ' + dst);
      }
      results = results.concat(copy(src, dst));
    } else {
      try {
        console.log('copying file: ' + dst);
        //fs.createReadStream(src).pipe(fs.createWriteStream(dst));
        fs.writeFileSync(dst, fs.readFileSync(src));
      } catch(e) {
        console.log('could\'t copy file: ' + dst);
      }
      results.push(src);
    }
  });
  return results;
}

var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

//cleanup dir
deleteFolderRecursive("lib");

fs.mkdirSync("lib/");
fs.mkdirSync("lib/i18n/");
fs.mkdirSync("lib/i18n/global");
fs.mkdirSync("lib/i18n/strings");

//copy dir
copy("src/i18n/global", "lib/i18n/global");
copy("src/i18n/strings", "lib/i18n/strings");
