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
function renderAttachment(event) {
    var a = document.createElement("a");
    a.rel = event.data.rel;
    a.target = event.data.target;
    a.download = event.data.download;
    a.href = event.data.url;
    a.textContent = event.data.textContent;
    if (event.data.blob) {
        a.href = window.URL.createObjectURL(event.data.blob);
    }
    document.body.appendChild(a);
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

    componentDidMount: function() {
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

    render: function() {
        const content = this.props.mxEvent.getContent();

        const text = this.presentableTextForFile(content);

        var TintableSvg = sdk.getComponent("elements.TintableSvg");
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

        function onIframeLoad(ev) {
            ev.target.contentWindow.postMessage({
                code: renderAttachment.toString(),
                url: contentUrl,
                blob: blobAttr,
                download: downloadAttr,
                target: "_blank",
                textContent: "Download " + text,
            }, "*");
        }


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
                            <iframe src={DEFAULT_CROSS_ORIGIN_RENDERER} onLoad={onIframeLoad}/>
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
