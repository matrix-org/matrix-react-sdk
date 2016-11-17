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

import React from 'react';
import filesize from 'filesize';
import MatrixClientPeg from '../../../MatrixClientPeg';
import sdk from '../../../index';
import {decryptFile} from '../../../utils/DecryptFile';
import Tinter from '../../../Tinter';
import 'isomorphic-fetch';
import q from 'q';

// A cached tinted copy of "img/download.svg"
var tintedDownloadImageURL;
// Track a list of mounted MFileBody instances so that we can update
// the "img/download.svg" when the tint changes.
var nextMountId = 0;
const mounts = {};

/**
 * Updates the tinted copy of "img/download.svg" when the tint changes.
 */
function updateTintedDownloadImage() {
    // Download the svg as an XML document.
    // We could cache the XML response here, but since the tint rarely changes
    // it's probably not worth it.
    q(fetch("img/download.svg")).then(function(response) {
        return response.text();
    }).then(function(svgText) {
        const svg = new DOMParser().parseFromString(svgText, "image/svg+xml");
        // Apply the fixups to the XML.
        const fixups = Tinter.calcSvgFixups([{contentDocument: svg}]);
        Tinter.applySvgFixups(fixups);
        // Encoded the fixed up SVG as a data URL.
        const svgString = new XMLSerializer().serializeToString(svg);
        tintedDownloadImageURL = "data:image/svg+xml;base64," + window.btoa(svgString);
        // Notify each mounted MFileBody that the URL has changed.
        Object.keys(mounts).forEach(function(id) {
            mounts[id].tint();
        });
    }).done();
}

Tinter.registerTintable(updateTintedDownloadImage);

// User supplied content can contain scripts, we have to be careful that
// we don't accidentally run those script within the same origin as the
// client. Otherwise those scripts written by remote users can read
// the access token and end-to-end keys that are in local storage.
//
// For attachments downloaded directly from the homeserver we can use
// Content-Security-Policy headers to disable script execution.
//
// But attachments with end-to-end ecryption are more difficult to handle.
// We need to decrypt the attachment on the client and then display it.
// To display the attachment we need to turn the decrypted bytes into a URL.
//
// There are two ways to turn bytes into URLs, data URL and blob URLs.
// Data URLs aren't suitable for downloading a file because Chrome has a
// 2MB limit on the size of URLs that can be viewed in the browser or
// downloaded. This limit does not seem to apply when the url is used as
// the source attribute of an image tag.
//
// Blob URLs are generated using window.URL.createObjectURL and unforuntately
// for our purposes they inherit the origin of the page that created them.
// This means that any scripts that run when the URL is viewed will be able
// to access local storage.
//
// The easiest solution is to host the code that generates the blob URL on
// a different domain to the client.
// Another possibility is to generate the blob URL within a sandboxed iframe.
// The downside of using a second domain is that it complicates hosting,
// the downside of using a sandboxed iframe is that the browers are overly
// restrictive in what you are allowed to do with the generated URL.
//
// So as a compomise we'll do both, that is use a second domain if one is
// configured, otherwise fall back to using a sandbox.
// To simplify deploying the client we'll try to keep as much of the rendering
// logic within the client domain as possible.
//
// To that end the first version of the blob generation will be the following
// html:
//
//      <html><head><script>
//      window.onmessage=function(e){eval("("+e.data.code+")")(e)}
//      </script></head><body></body></html>
//
// This waits to receive a message event sent using the window.postMessage API.
// When it receives the event it evals a javascript function in data.code and
// runs the function passing the event as an argument.
//
// In particular it means that the rendering function can be written as a
// ordinary javascript function which then is turned into a string using
// toString().
//
const DEFAULT_CROSS_ORIGIN_RENDERER = "data:text/html;base64," + window.btoa(`
<html><head><script>
window.onmessage=function(e){eval("("+e.data.code+")")(e)}
\u003c/script></head><body></body></html>
`);


/**
 * Render the attachment inside the iframe.
 * We can't use imported libraries here so this has to be vanilla JS.
 */
function remoteRender(event) {
    const a = document.createElement("a");
    const img = document.createElement("img");
    const data = event.data;
    img.id = "img";
    img.src = data.downloadImage;
    a.id = "a";
    a.rel = data.rel;
    a.target = data.target;
    a.download = data.download;
    a.href = data.url;
    a.style = data.style;
    if (data.blob) {
        a.href = window.URL.createObjectURL(data.blob);
    }
    a.appendChild(img);
    a.appendChild(document.createTextNode(data.textContent));

    const body = document.body;
    body.style = "margin: 0px; overflow: hidden";
    body.appendChild(a);
}

function remoteSetTint(event) {
    const img = document.getElementById("img");
    const a = document.getElementById("a");
    const data = event.data;
    img.src = data.downloadImage;
    a.style = data.style;
}

module.exports = React.createClass({
    displayName: 'MFileBody',

    getInitialState: function() {
        return {
            decryptedBlob: (this.props.decryptedBlob ? this.props.decryptedBlob : null),
        };
    },

    /**
     * Extracts a human readable label for the file attachment to use as
     * link text.
     *
     * @params {Object} content The "content" key of the matrix event.
     * @return {string} the human readable link text for the attachment.
     */
    presentableTextForFile: function(content) {
        var linkText = 'Attachment';
        if (content.body && content.body.length > 0) {
            // The content body should be the name of the file including a
            // file extension.
            linkText = content.body;
        }

        if (content.info && content.info.size) {
            // If we know the size of the file then add it as human readable
            // string to the end of the link text so that the user knows how
            // big a file they are downloading.
            // The content.info also contains a MIME-type but we don't display
            // it since it is "ugly", users generally aren't aware what it
            // means and the type of the attachment can usually be inferrered
            // from the file extension.
            linkText += ' (' + filesize(content.info.size) + ')';
        }
        return linkText;
    },

    _getContentUrl: function() {
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined) {
            return null;
        } else {
            return MatrixClientPeg.get().mxcUrlToHttp(content.url);
        }
    },

    componentWillMount: function() {
        this.id = nextMountId++;
    },

    componentDidMount: function() {
        // Add this to the list of mounted components to receive notifications
        // when the tint changes.
        mounts[this.id] = this;
        this.tint();
        // Check whether we need to decrypt the file content.
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined && this.state.decryptedBlob === null) {
            decryptFile(content.file).done((blob) => {
                this.setState({
                    decryptedBlob: blob,
                });
            }, (err) => {
                console.warn("Unable to decrypt attachment: ", err)
                // Set a placeholder image when we can't decrypt the image.
                this.refs.image.src = "img/warning.svg";
            });
        }
    },

    componentWillUnmount: function() {
        // Remove this from the list of mounted components
        delete mounts[this.id];
    },

    tint: function() {
        // Update our tinted copy of "img/download.svg"
        if (this.refs.iframe) {
            this.refs.iframe.contentWindow.postMessage({
                code: remoteSetTint.toString(),
                downloadImage: tintedDownloadImageURL,
                style: this.linkStyle(),
            }, "*");
        }
    },

    linkStyle: function() {
        if (this.refs.dummyLink) {
            const style = window.getComputedStyle(this.refs.dummyLink, null);
            var cssText = style.cssText;
            if (cssText == "") {
                // Firefox doesn't implement ".cssText" for computed styles.
                // https://bugzilla.mozilla.org/show_bug.cgi?id=137687
                for (var i = 0; i < style.length; i++) {
                    cssText += style[i] + ":";
                    cssText += style.getPropertyValue(style[i]) + ";";
                }
            }
            return cssText;
        }
    },

    render: function() {
        const content = this.props.mxEvent.getContent();

        const text = this.presentableTextForFile(content);

        if (content.file !== undefined && this.state.decryptedBlob === null) {
            // Need to decrypt the attachment
            // The attachment is decrypted in componentDidMount.
            // For now add an img tag with a spinner.
            return (
                <span className="mx_MFileBody" ref="body">
                <img src="img/spinner.gif" ref="image"
                    alt={content.body} />
                </span>
            );
        }

        const contentUrl = this._getContentUrl();

        const fileName = content.body && content.body.length > 0 ? content.body : "Attachment";

        var downloadAttr = undefined;
        var blobAttr = undefined;
        if (this.state.decryptedBlob) {
            // Set a download attribute for encrypted files so that the file
            // will have the correct name when the user tries to download it.
            // We can't provide a Content-Disposition header like we would for HTTP.
            downloadAttr = fileName;
            blobAttr = this.state.decryptedBlob;
        }

        const onIframeLoad = (ev) => {
            ev.target.contentWindow.postMessage({
                mFileBodyId: this.id,
                code: remoteRender.toString(),
                url: contentUrl,
                downloadImage: tintedDownloadImageURL,
                style: this.linkStyle(),
                blob: blobAttr,
                download: downloadAttr,
                target: "_blank",
                textContent: "Download " + text,
            }, "*");
        };

        if (contentUrl || blobAttr) {
            if (this.props.tileShape === "file_grid") {
                return (
                    <span className="mx_MFileBody">
                        <div className="mx_MImageBody_download">
                            <a className="mx_ImageBody_downloadLink" href={contentUrl} target="_blank" rel="noopener" download={downloadAttr}>
                                { fileName }
                            </a>
                            <div className="mx_MImageBody_size">
                                { content.info && content.info.size ? filesize(content.info.size) : "" }
                            </div>
                        </div>
                    </span>
                );
            }
            else {
                return (
                    <span className="mx_MFileBody">
                        <div className="mx_MImageBody_download">
                            <a ref="dummyLink"/>
                            <iframe src={DEFAULT_CROSS_ORIGIN_RENDERER} onLoad={onIframeLoad} ref="iframe"/>
                        </div>
                    </span>
                );
            }
        } else {
            var extra = text ? (': ' + text) : '';
            return <span className="mx_MFileBody">
                Invalid file{extra}
            </span>
        }
    },
});
