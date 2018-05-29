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
import { MatrixClient } from 'matrix-js-sdk';

import MFileBody from './MFileBody';
import ImageUtils from '../../../ImageUtils';
import Modal from '../../../Modal';
import sdk from '../../../index';
import dis from '../../../dispatcher';
import { decryptFile } from '../../../utils/DecryptFile';
import Promise from 'bluebird';
import { _t } from '../../../languageHandler';
import SettingsStore from "../../../settings/SettingsStore";

export default class extends React.Component {
    displayName: 'MImageBody'

    static propTypes = {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,

        /* called when the image has loaded */
        onWidgetLoad: PropTypes.func.isRequired,
    }

    static contextTypes = {
        matrixClient: PropTypes.instanceOf(MatrixClient),
    }

    constructor(props) {
        super(props);

        this.onAction = this.onAction.bind(this);
        this.onImageError = this.onImageError.bind(this);
        this.onImageLoad = this.onImageLoad.bind(this);
        this.onImageEnter = this.onImageEnter.bind(this);
        this.onImageLeave = this.onImageLeave.bind(this);
        this.onClientSync = this.onClientSync.bind(this);
        this.onClick = this.onClick.bind(this);
        this.fixupHeight = this.fixupHeight.bind(this);
        this._isGif = this._isGif.bind(this);

        this.state = {
            decryptedUrl: null,
            decryptedThumbnailUrl: null,
            decryptedBlob: null,
            error: null,
            imgError: false,
        };
    }

    componentWillMount() {
        this.unmounted = false;
        this.context.matrixClient.on('sync', this.onClientSync);
    }

    // FIXME: factor this out and aplpy it to MVideoBody and MAudioBody too!
    onClientSync(syncState, prevState) {
        if (this.unmounted) return;
        // Consider the client reconnected if there is no error with syncing.
        // This means the state could be RECONNECTING, SYNCING or PREPARED.
        const reconnected = syncState !== "ERROR" && prevState !== syncState;
        if (reconnected && this.state.imgError) {
            // Load the image again
            this.setState({
                imgError: false,
            });
        }
    }

    onClick(ev) {
        if (ev.button == 0 && !ev.metaKey) {
            ev.preventDefault();
            const content = this.props.mxEvent.getContent();
            const httpUrl = this._getContentUrl();
            const ImageView = sdk.getComponent("elements.ImageView");
            const params = {
                src: httpUrl,
                name: content.body && content.body.length > 0 ? content.body : _t('Attachment'),
                mxEvent: this.props.mxEvent,
            };

            if (content.info) {
                params.width = content.info.w;
                params.height = content.info.h;
                params.fileSize = content.info.size;
            }

            Modal.createDialog(ImageView, params, "mx_Dialog_lightbox");
        }
    }

    _isGif() {
        const content = this.props.mxEvent.getContent();
        return (
          content &&
          content.info &&
          content.info.mimetype === "image/gif"
        );
    }

    onImageEnter(e) {
        if (!this._isGif() || SettingsStore.getValue("autoplayGifsAndVideos")) {
            return;
        }
        const imgElement = e.target;
        imgElement.src = this._getContentUrl();
    }

    onImageLeave(e) {
        if (!this._isGif() || SettingsStore.getValue("autoplayGifsAndVideos")) {
            return;
        }
        const imgElement = e.target;
        imgElement.src = this._getThumbUrl();
    }

    onImageError() {
        this.setState({
            imgError: true,
        });
    }

    onImageLoad() {
        this.props.onWidgetLoad();
    }

    _getContentUrl() {
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined) {
            return this.state.decryptedUrl;
        } else {
            return this.context.matrixClient.mxcUrlToHttp(content.url);
        }
    }

    _getThumbUrl() {
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined) {
            // Don't use the thumbnail for clients wishing to autoplay gifs.
            if (this.state.decryptedThumbnailUrl) {
                return this.state.decryptedThumbnailUrl;
            }
            return this.state.decryptedUrl;
        } else if (content.info &&
                   content.info.mimetype == "image/svg+xml" &&
                   content.info.thumbnail_url) {
            // special case to return client-generated thumbnails for SVGs, if any,
            // given we deliberately don't thumbnail them serverside to prevent
            // billion lol attacks and similar
            return this.context.matrixClient.mxcUrlToHttp(
                content.info.thumbnail_url, 800, 600,
            );
        } else {
            return this.context.matrixClient.mxcUrlToHttp(content.url, 800, 600);
        }
    }

    componentDidMount() {
        this.dispatcherRef = dis.register(this.onAction);
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined && this.state.decryptedUrl === null) {
            let thumbnailPromise = Promise.resolve(null);
            if (content.info.thumbnail_file) {
                thumbnailPromise = decryptFile(
                    content.info.thumbnail_file,
                ).then(function(blob) {
                    return URL.createObjectURL(blob);
                });
            }
            let decryptedBlob;
            thumbnailPromise.then((thumbnailUrl) => {
                return decryptFile(content.file).then(function(blob) {
                    decryptedBlob = blob;
                    return URL.createObjectURL(blob);
                }).then((contentUrl) => {
                    this.setState({
                        decryptedUrl: contentUrl,
                        decryptedThumbnailUrl: thumbnailUrl,
                        decryptedBlob: decryptedBlob,
                    });
                });
            }).catch((err) => {
                console.warn("Unable to decrypt attachment: ", err);
                // Set a placeholder image when we can't decrypt the image.
                this.setState({
                    error: err,
                });
            }).done();
        }
        this.fixupHeight();
        this._afterComponentDidMount();
    }

    // To be overridden by subclasses (e.g. MStickerBody) for further
    // initialisation after componentDidMount
    _afterComponentDidMount() {
    }

    componentWillUnmount() {
        this.unmounted = true;
        dis.unregister(this.dispatcherRef);
        this.context.matrixClient.removeListener('sync', this.onClientSync);
        this._afterComponentWillUnmount();

        if (this.state.decryptedUrl) {
            URL.revokeObjectURL(this.state.decryptedUrl);
        }
        if (this.state.decryptedThumbnailUrl) {
            URL.revokeObjectURL(this.state.decryptedThumbnailUrl);
        }
    }

    // To be overridden by subclasses (e.g. MStickerBody) for further
    // cleanup after componentWillUnmount
    _afterComponentWillUnmount() {
    }

    onAction(payload) {
        if (payload.action === "timeline_resize") {
            this.fixupHeight();
        }
    }

    fixupHeight() {
        if (!this.refs.image) {
            console.warn(`Refusing to fix up height on ${this.displayName} with no image element`);
            return;
        }

        const content = this.props.mxEvent.getContent();
        const timelineWidth = this.refs.body.offsetWidth;
        const maxHeight = 600; // let images take up as much width as they can so long as the height doesn't exceed 600px.
        // the alternative here would be 600*timelineWidth/800; to scale them down to fit inside a 4:3 bounding box

        // FIXME: this will break on clientside generated thumbnails (as per e2e rooms)
        // which may well be much smaller than the 800x600 bounding box.

        // FIXME: It will also break really badly for images with broken or missing thumbnails

        // FIXME: Because we don't know what size of thumbnail the server's actually going to send
        // us, we can't even really layout the page nicely for it.  Instead we have to assume
        // it'll target 800x600 and we'll downsize if needed to make things fit.

        // console.log("trying to fit image into timelineWidth of " + this.refs.body.offsetWidth + " or " + this.refs.body.clientWidth);
        let thumbHeight = null;
        if (content.info) {
            thumbHeight = ImageUtils.thumbHeight(content.info.w, content.info.h, timelineWidth, maxHeight);
        }
        this.refs.image.style.height = thumbHeight + "px";
        // console.log("Image height now", thumbHeight);
    }

    _messageContent(contentUrl, thumbUrl, content) {
        const thumbnail = (
            <a href={contentUrl} onClick={this.onClick}>
                <img className="mx_MImageBody_thumbnail" src={thumbUrl} ref="image"
                    alt={content.body}
                    onError={this.onImageError}
                    onLoad={this.onImageLoad}
                    onMouseEnter={this.onImageEnter}
                    onMouseLeave={this.onImageLeave} />
            </a>
        );

        return (
            <span className="mx_MImageBody" ref="body">
                { thumbUrl && !this.state.imgError ? thumbnail : '' }
                <MFileBody {...this.props} decryptedBlob={this.state.decryptedBlob} />
            </span>
      );
    }

    render() {
        const content = this.props.mxEvent.getContent();

        if (this.state.error !== null) {
            return (
                <span className="mx_MImageBody" ref="body">
                    <img src="img/warning.svg" width="16" height="16" />
                    { _t("Error decrypting image") }
                </span>
            );
        }

        if (content.file !== undefined && this.state.decryptedUrl === null) {
            // Need to decrypt the attachment
            // The attachment is decrypted in componentDidMount.
            // For now add an img tag with a spinner.
            return (
                <span className="mx_MImageBody" ref="body">
                    <div className="mx_MImageBody_thumbnail" ref="image" style={{
                        "display": "flex",
                        "alignItems": "center",
                        "width": "100%",
                    }}>
                        <img src="img/spinner.gif" alt={content.body} width="32" height="32" style={{
                            "margin": "auto",
                        }} />
                    </div>
                </span>
            );
        }

        const contentUrl = this._getContentUrl();
        let thumbUrl;
        if (this._isGif() && SettingsStore.getValue("autoplayGifsAndVideos")) {
          thumbUrl = contentUrl;
        } else {
          thumbUrl = this._getThumbUrl();
        }

        return this._messageContent(contentUrl, thumbUrl, content);
    }
}
