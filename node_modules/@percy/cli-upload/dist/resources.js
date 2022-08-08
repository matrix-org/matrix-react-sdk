import path from 'path';
import { sha256hash } from '@percy/client/utils'; // Returns a root resource object with a sha and mimetype.

function createRootResource(url, content) {
  return {
    url,
    content,
    sha: sha256hash(content),
    mimetype: 'text/html',
    root: true
  };
} // Returns an image resource object with a sha.


function createImageResource(url, content, mimetype) {
  return {
    url,
    content,
    sha: sha256hash(content),
    mimetype
  };
} // Returns root resource and image resource objects based on an image's
// filename, contents, and dimensions. The root resource is a generated DOM
// designed to display an image at it's native size without margins or padding.


export function createImageResources(filename, content, size) {
  let {
    dir,
    name,
    ext
  } = path.parse(filename);
  let rootUrl = `/${encodeURIComponent(path.join(dir, name))}`;
  let imageUrl = `/${encodeURIComponent(filename)}`;
  let mimetype = ext === '.png' ? 'image/png' : 'image/jpeg';
  return [createRootResource(rootUrl, `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
          <style>
            *, *::before, *::after { margin: 0; padding: 0; font-size: 0; }
            html, body { width: 100%; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          <img src="${imageUrl}" width="${size.width}px" height="${size.height}px"/>
        </body>
      </html>
    `), createImageResource(imageUrl, content, mimetype)];
}
export default createImageResources;