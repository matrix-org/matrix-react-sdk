/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd

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
import PropTypes from 'prop-types';
import filesize from 'filesize';
import MatrixClientPeg from '../../../MatrixClientPeg';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import {decryptFile} from '../../../utils/DecryptFile';
import Tinter from '../../../Tinter';
import request from 'browser-request';
import Modal from '../../../Modal';


// A cached tinted copy of "img/download.svg"
let tintedDownloadImageURL;
// Track a list of mounted MFileBody instances so that we can update
// the "img/download.svg" when the tint changes.
let nextMountId = 0;
const mounts = {};

/**
 * Updates the tinted copy of "img/download.svg" when the tint changes.
 */
function updateTintedDownloadImage() {
    // Download the svg as an XML document.
    // We could cache the XML response here, but since the tint rarely changes
    // it's probably not worth it.
    // Also note that we can't use fetch here because fetch doesn't support
    // file URLs, which the download image will be if we're running from
    // the filesystem (like in an Electron wrapper).
    request({uri: "img/download.svg"}, (err, response, body) => {
        if (err) return;

        const svg = new DOMParser().parseFromString(body, "image/svg+xml");
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
    });
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
// But attachments with end-to-end encryption are more difficult to handle.
// We need to decrypt the attachment on the client and then display it.
// To display the attachment we need to turn the decrypted bytes into a URL.
//
// There are two ways to turn bytes into URLs, data URL and blob URLs.
// Data URLs aren't suitable for downloading a file because Chrome has a
// 2MB limit on the size of URLs that can be viewed in the browser or
// downloaded. This limit does not seem to apply when the url is used as
// the source attribute of an image tag.
//
// Blob URLs are generated using window.URL.createObjectURL and unfortunately
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
// For now given how unusable the blobs generated in sandboxed iframes are we
// default to using a renderer hosted on "usercontent.riot.im". This is
// overridable so that people running their own version of the client can
// choose a different renderer.
//
// To that end the current version of the blob generation is the following
// html:
//
//      <html><head><script>
//      var params = window.location.search.substring(1).split('&');
//      var lockOrigin;
//      for (var i = 0; i < params.length; ++i) {
//          var parts = params[i].split('=');
//          if (parts[0] == 'origin') lockOrigin = decodeURIComponent(parts[1]);
//      }
//      window.onmessage=function(e){
//          if (lockOrigin === undefined || e.origin === lockOrigin) eval("("+e.data.code+")")(e);
//      }
//      </script></head><body></body></html>
//
// This waits to receive a message event sent using the window.postMessage API.
// When it receives the event it evals a javascript function in data.code and
// runs the function passing the event as an argument. This version adds
// support for a query parameter controlling the origin from which messages
// will be processed as an extra layer of security (note that the default URL
// is still 'v1' since it is backwards compatible).
//
// In particular it means that the rendering function can be written as a
// ordinary javascript function which then is turned into a string using
// toString().
//
const DEFAULT_CROSS_ORIGIN_RENDERER = "https://usercontent.riot.im/v1.html";

/**
 * Render the attachment inside the iframe.
 * We can't use imported libraries here so this has to be vanilla JS.
 */
function remoteRender(event) {
    const data = event.data;

    const img = document.createElement("img");
    img.id = "img";
    img.src = data.imgSrc;

    const a = document.createElement("a");
    a.id = "a";
    a.rel = data.rel;
    a.target = data.target;
    a.download = data.download;
    a.style = data.style;
    a.href = window.URL.createObjectURL(data.blob);
    a.appendChild(img);
    a.appendChild(document.createTextNode(data.textContent));

    const body = document.body;
    // Don't display scrollbars if the link takes more than one line
    // to display.
    body.style = "margin: 0px; overflow: hidden";
    body.appendChild(a);
}

/**
 * Update the tint inside the iframe.
 * We can't use imported libraries here so this has to be vanilla JS.
 */
function remoteSetTint(event) {
    const data = event.data;

    const img = document.getElementById("img");
    img.src = data.imgSrc;
    img.style = data.imgStyle;

    const a = document.getElementById("a");
    a.style = data.style;
}


/**
 * Get the current CSS style for a DOMElement.
 * @param {HTMLElement} element The element to get the current style of.
 * @return {string} The CSS style encoded as a string.
 */
function computedStyle(element) {
    if (!element) {
        return "";
    }
    const style = window.getComputedStyle(element, null);
    let cssText = style.cssText;
    if (cssText == "") {
        // Firefox doesn't implement ".cssText" for computed styles.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=137687
        for (let i = 0; i < style.length; i++) {
            cssText += style[i] + ":";
            cssText += style.getPropertyValue(style[i]) + ";";
        }
    }
    return cssText;
}

module.exports = React.createClass({
    displayName: 'MFileBody',

    getInitialState: function() {
        return {
            decryptedBlob: (this.props.decryptedBlob ? this.props.decryptedBlob : null),
        };
    },

    contextTypes: {
        appConfig: PropTypes.object,
    },

    /**
     * Extracts a human readable label for the file attachment to use as
     * link text.
     *
     * @params {Object} content The "content" key of the matrix event.
     * @return {string} the human readable link text for the attachment.
     */
    presentableTextForFile: function(content) {
        let linkText = _t("Attachment");
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
        return MatrixClientPeg.get().mxcUrlToHttp(content.url);
    },

    componentDidMount: function() {
        // Add this to the list of mounted components to receive notifications
        // when the tint changes.
        this.id = nextMountId++;
        mounts[this.id] = this;
        this.tint();
    },

    componentWillUnmount: function() {
        // Remove this from the list of mounted components
        delete mounts[this.id];
    },

    tint: function() {
        // Update our tinted copy of "img/download.svg"
        if (this.refs.downloadImage) {
            this.refs.downloadImage.src = tintedDownloadImageURL;
        }
        if (this.refs.iframe) {
            // If the attachment is encrypted then the download image
            // will be inside the iframe so we wont be able to update
            // it directly.
            this.refs.iframe.contentWindow.postMessage({
                code: remoteSetTint.toString(),
                imgSrc: tintedDownloadImageURL,
                style: computedStyle(this.refs.dummyLink),
            }, "*");
        }
    },

    render: function() {
        const content = this.props.mxEvent.getContent();
        const text = this.presentableTextForFile(content);
        const isEncrypted = content.file !== undefined;
        const fileName = content.body && content.body.length > 0 ? content.body : _t("Attachment");
        const contentUrl = this._getContentUrl();
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

        if (isEncrypted) {
            if (this.state.decryptedBlob === null) {
                // Need to decrypt the attachment
                // Wait for the user to click on the link before downloading
                // and decrypting the attachment.
                let decrypting = false;
                const decrypt = () => {
                    if (decrypting) {
                        return false;
                    }
                    decrypting = true;
                    decryptFile(content.file).then((blob) => {
                        this.setState({
                            decryptedBlob: blob,
                        });
                    }).catch((err) => {
                        console.warn("Unable to decrypt attachment: ", err);
                        Modal.createTrackedDialog('Error decrypting attachment', '', ErrorDialog, {
                            title: _t("Error"),
                            description: _t("Error decrypting attachment"),
                        });
                    }).finally(() => {
                        decrypting = false;
                        return;
                    });
                };

                return (
                    <span className="mx_MFileBody" ref="body">
                        <div className="mx_MFileBody_download">
                            <a href="javascript:void(0)" onClick={decrypt}>
                                { _t("Decrypt %(text)s", { text: text }) }
                            </a>
                        </div>
                    </span>
                );
            }

            // When the iframe loads we tell it to render a download link
            const onIframeLoad = (ev) => {
                ev.target.contentWindow.postMessage({
                    code: remoteRender.toString(),
                    imgSrc: tintedDownloadImageURL,
                    style: computedStyle(this.refs.dummyLink),
                    blob: this.state.decryptedBlob,
                    // Set a download attribute for encrypted files so that the file
                    // will have the correct name when the user tries to download it.
                    // We can't provide a Content-Disposition header like we would for HTTP.
                    download: fileName,
                    rel: "noopener",
                    target: "_blank",
                    textContent: _t("Download %(text)s", { text: text }),
                }, "*");
            };

            // If the attachment is encryped then put the link inside an iframe.
            let renderer_url = DEFAULT_CROSS_ORIGIN_RENDERER;
            if (this.context.appConfig && this.context.appConfig.cross_origin_renderer_url) {
                renderer_url = this.context.appConfig.cross_origin_renderer_url;
            }
            renderer_url += "?origin=" + encodeURIComponent(window.location.origin);
            return (
                <span className="mx_MFileBody">
                    <div className="mx_MFileBody_download">
                        <div style={{display: "none"}}>
                            { /*
                              * Add dummy copy of the "a" tag
                              * We'll use it to learn how the download link
                              * would have been styled if it was rendered inline.
                              */ }
                            <a ref="dummyLink" />
                        </div>
                        <iframe src={renderer_url} onLoad={onIframeLoad} ref="iframe" />
                    </div>
                </span>
            );
        } else if (contentUrl) {
            // If the attachment is not encrypted then we check whether we
            // are being displayed in the room timeline or in a list of
            // files in the right hand side of the screen.
            if (this.props.tileShape === "file_grid") {
                return (
                    <span className="mx_MFileBody">
                        <div className="mx_MFileBody_download">
                            <a className="mx_MFileBody_downloadLink" href={contentUrl} download={fileName} target="_blank">
                                { fileName }
                            </a>
                            <div className="mx_MImageBody_size">
                                { content.info && content.info.size ? filesize(content.info.size) : "" }
                            </div>
                        </div>
                    </span>
                );
            } else {
                return (
                    <span className="mx_MFileBody">
                        <div className="mx_MFileBody_download">
                            <a href={contentUrl} download={fileName} target="_blank" rel="noopener">
                                <img src={tintedDownloadImageURL} width="12" height="14" ref="downloadImage" />
                                { _t("Download %(text)s", { text: text }) }
                            </a>
                        </div>
                    </span>
                );
            }
        } else {
            const extra = text ? (': ' + text) : '';
            return <span className="mx_MFileBody">
                { _t("Invalid file%(extra)s", { extra: extra }) }
            </span>;
        }
    },
});
