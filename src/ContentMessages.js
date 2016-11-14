/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

var q = require('q');
var extend = require('./extend');
var dis = require('./dispatcher');
var MatrixClientPeg = require('./MatrixClientPeg');
var sdk = require('./index');
var Modal = require('./Modal');

var encrypt = require("browser-encrypt-attachment");

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;


/**
 * Create a thumbnail for a image or video element.
 */
function createThumbnail(element, mimeType) {
    const deferred = q.defer();

    const inputWidth = element.width;
    const inputHeight = element.height;

    var targetWidth = inputWidth;
    var targetHeight = inputHeight;
    if (targetHeight > MAX_HEIGHT) {
        targetWidth *= MAX_HEIGHT / targetHeight;
        targetHeight = MAX_HEIGHT;
    }
    if (targetWidth > MAX_WIDTH) {
        targetHeight *= MAX_WIDTH / targetWidth;
        targetWidth = MAX_WIDTH;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.getContext("2d").drawImage(element, 0, 0, targetWidth, targetHeight);
    canvas.toBlob(function(thumbnail) {
        deferred.resolve({
            info: {
                thumbnail_info: {
                    w: targetWidth,
                    h: targetHeight,
                    mimetype: thumbnail.type,
                    size: thumbnail.size,
                },
                w: inputWidth,
                h: inputHeight,
            },
            thumbnail: thumbnail
        });
    }, mimeType);

    return deferred.promise;
}


/**
 * Load a file into an image element.
 */
function loadImageElement(imageFile) {
    var deferred = q.defer();

    // Load the file into an html element
    var img = document.createElement("img");

    var reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;

        // Once ready, create a thumbnail
        img.onload = function() {
            deferred.resolve(img);
        };
        img.onerror = function(e) {
            deferred.reject(e);
        };
    };
    reader.onerror = function(e) {
        deferred.reject(e);
    };
    reader.readAsDataURL(imageFile);

    return deferred.promise;
}

function infoForImageFile(matrixClient, roomId, imageFile) {
    var thumbnailType = "image/png";
    if (imageFile.type == "image/jpeg") {
        thumbnailType = "image/jpeg";
    }
    var imageInfo;
    return loadImageElement(imageFile).then(function(img) {
        return createThumbnail(img, thumbnailType);
    }).then(function(result) {
        imageInfo = result.info;
        return uploadFile(matrixClient, roomId, result.thumbnail);
    }).then(function(result) {
        imageInfo.thumbnail_url = result.url;
        imageInfo.thumbnail_file = result.file;
        return imageInfo;
    });
}

function infoForVideoFile(videoFile) {
    var deferred = q.defer();

    // Load the file into an html element
    var video = document.createElement("video");

    var reader = new FileReader();
    reader.onload = function(e) {
        video.src = e.target.result;

        // Once ready, returns its size
        video.onloadedmetadata = function() {
            deferred.resolve({
                w: video.videoWidth,
                h: video.videoHeight
            });
        };
        video.onerror = function(e) {
            deferred.reject(e);
        };
    };
    reader.onerror = function(e) {
        deferred.reject(e);
    };
    reader.readAsDataURL(videoFile);

    return deferred.promise;
}

/**
 * Read the file as an ArrayBuffer.
 * @return {Promise} A promise that resolves with an ArrayBuffer when the file
 *   is read.
 */
function readFileAsArrayBuffer(file) {
    const deferred = q.defer();
    const reader = new FileReader();
    reader.onload = function(e) {
        deferred.resolve(e.target.result);
    };
    reader.onerror = function(e) {
        deferred.reject(e);
    };
    reader.readAsArrayBuffer(file);
    return deferred.promise;
}


function uploadFile(matrixClient, roomId, file) {
    if (matrixClient.isRoomEncrypted(roomId) || true) {
        // If the room is encrypted then encrypt the file before uploading it.
        // First read the file into memory.
        return readFileAsArrayBuffer(file).then(function(data) {
            // Then encrypt the file.
            return encrypt.encryptAttachment(data);
        }).then(function(encryptResult) {
            // Record the information needed to decrypt the attachment.
            const encryptInfo = encryptResult.info;
            // Pass the encrypted data as a Blob to the uploader.
            const blob = new Blob([encryptResult.data]);
            return matrixClient.uploadContent(blob).then(function(url) {
                // If the attachment is encrypted then bundle the URL along
                // with the information needed to decrypt the attachment and
                // add it under a file key.
                encryptInfo.url = url;
                if (file.type) {
                    encryptInfo.mimetype = file.type;
                }
                return {"file": encryptInfo};
            });
        });
    } else {
        return matrixClient.uploadContent(file).then(function(url) {
        // If the attachment isn't encrypted then include the URL directly.
            return {"url": url};
        });
    }
}


class ContentMessages {
    constructor() {
        this.inprogress = [];
        this.nextId = 0;
    }

    sendContentToRoom(file, roomId, matrixClient) {
        var content = {
            body: file.name,
            info: {
                size: file.size,
            }
        };

        // if we have a mime type for the file, add it to the message metadata
        if (file.type) {
            content.info.mimetype = file.type;
        }

        var def = q.defer();
        var thumbnailBlob;
        if (file.type.indexOf('image/') == 0) {
            content.msgtype = 'm.image';
            infoForImageFile(matrixClient, roomId, file).then(imageInfo=>{
                extend(content.info, imageInfo);
                def.resolve();
            }, error=>{
                console.error(error);
                content.msgtype = 'm.file';
                def.resolve();
            });
        } else if (file.type.indexOf('audio/') == 0) {
            content.msgtype = 'm.audio';
            def.resolve();
        } else if (file.type.indexOf('video/') == 0) {
            content.msgtype = 'm.video';
            infoForVideoFile(file).then(videoInfo=>{
                extend(content.info, videoInfo);
                def.resolve();
            }, error=>{
                content.msgtype = 'm.file';
                def.resolve();
            });
        } else {
            content.msgtype = 'm.file';
            def.resolve();
        }

        var upload = {
            fileName: file.name,
            roomId: roomId,
            total: 0,
            loaded: 0,
            promise: def.promise,
        };
        this.inprogress.push(upload);
        dis.dispatch({action: 'upload_started'});

        var encryptInfo = null;
        var error;
        var self = this;

        return def.promise.then(function() {
            upload.promise = uploadFile(
                matrixClient, roomId, file
            ).then(function(result) {
                content.file = result.file;
                content.url = result.url;
            });
            return upload.promise;
        }).progress(function(ev) {
            if (ev) {
                upload.total = ev.total;
                upload.loaded = ev.loaded;
                dis.dispatch({action: 'upload_progress', upload: upload});
            }
        }).then(function(url) {
            return matrixClient.sendMessage(roomId, content);
        }, function(err) {
            error = err;
            if (!upload.canceled) {
                var desc = "The file '"+upload.fileName+"' failed to upload.";
                if (err.http_status == 413) {
                    desc = "The file '"+upload.fileName+"' exceeds this home server's size limit for uploads";
                }
                var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createDialog(ErrorDialog, {
                    title: "Upload Failed",
                    description: desc
                });
            }
        }).finally(function() {
            var inprogressKeys = Object.keys(self.inprogress);
            for (var i = 0; i < self.inprogress.length; ++i) {
                var k = inprogressKeys[i];
                if (self.inprogress[k].promise === upload.promise) {
                    self.inprogress.splice(k, 1);
                    break;
                }
            }
            if (error) {
                dis.dispatch({action: 'upload_failed', upload: upload});
            }
            else {
                dis.dispatch({action: 'upload_finished', upload: upload});
            }
        });
    }

    getCurrentUploads() {
        return this.inprogress;
    }

    cancelUpload(promise) {
        var inprogressKeys = Object.keys(this.inprogress);
        var upload;
        for (var i = 0; i < this.inprogress.length; ++i) {
            var k = inprogressKeys[i];
            if (this.inprogress[k].promise === promise) {
                upload = this.inprogress[k];
                break;
            }
        }
        if (upload) {
            upload.canceled = true;
            MatrixClientPeg.get().cancelUpload(upload.promise);
        }
    }
}

if (global.mx_ContentMessage === undefined) {
    global.mx_ContentMessage = new ContentMessages();
}

module.exports = global.mx_ContentMessage;
