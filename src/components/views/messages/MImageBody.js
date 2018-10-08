/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>

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

import React from 'react';
import PropTypes from 'prop-types';
import { MatrixClient } from 'matrix-js-sdk';

import MFileBody from './MFileBody';
import Modal from '../../../Modal';
import sdk from '../../../index';
import { decryptFile } from '../../../utils/DecryptFile';
import Promise from 'bluebird';
import { _t } from '../../../languageHandler';
import SettingsStore from "../../../settings/SettingsStore";

export default class MImageBody extends React.Component {
    static propTypes = {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,

        /* called when the image has loaded */
        onWidgetLoad: PropTypes.func.isRequired,

        /* the maximum image height to use */
        maxImageHeight: PropTypes.number,
    };

    static contextTypes = {
        matrixClient: PropTypes.instanceOf(MatrixClient),
    };

    constructor(props) {
        super(props);

        this.onImageError = this.onImageError.bind(this);
        this.onImageLoad = this.onImageLoad.bind(this);
        this.onImageEnter = this.onImageEnter.bind(this);
        this.onImageLeave = this.onImageLeave.bind(this);
        this.onClientSync = this.onClientSync.bind(this);
        this.onClick = this.onClick.bind(this);
        this._isGif = this._isGif.bind(this);

        this.state = {
            decryptedUrl: null,
            decryptedThumbnailUrl: null,
            decryptedBlob: null,
            error: null,
            imgError: false,
            imgLoaded: false,
            loadedImageDimensions: null,
            hover: false,
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
        // This means the state could be RECONNECTING, SYNCING, PREPARED or CATCHUP.
        const reconnected = syncState !== "ERROR" && prevState !== syncState;
        if (reconnected && this.state.imgError) {
            // Load the image again
            this.setState({
                imgError: false,
            });
        }
    }

    onClick(ev) {
        if (ev.button === 0 && !ev.metaKey) {
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
        this.setState({ hover: true });

        if (!this._isGif() || SettingsStore.getValue("autoplayGifsAndVideos")) {
            return;
        }
        const imgElement = e.target;
        imgElement.src = this._getContentUrl();
    }

    onImageLeave(e) {
        this.setState({ hover: false });

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

        let loadedImageDimensions;

        if (this.refs.image) {
            const { naturalWidth, naturalHeight } = this.refs.image;

            loadedImageDimensions = { naturalWidth, naturalHeight };
        }

        this.setState({ imgLoaded: true, loadedImageDimensions });
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
        } else if (content.info && content.info.mimetype === "image/svg+xml" && content.info.thumbnail_url) {
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
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined && this.state.decryptedUrl === null) {
            let thumbnailPromise = Promise.resolve(null);
            if (content.info && content.info.thumbnail_file) {
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
        this._afterComponentDidMount();
    }

    // To be overridden by subclasses (e.g. MStickerBody) for further
    // initialisation after componentDidMount
    _afterComponentDidMount() {
    }

    componentWillUnmount() {
        this.unmounted = true;
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

    _messageContent(contentUrl, thumbUrl, content) {
        let infoWidth;
        let infoHeight;

        if (content && content.info && content.info.w && content.info.h) {
            infoWidth = content.info.w;
            infoHeight = content.info.h;
        } else {
            // Whilst the image loads, display nothing.
            //
            // Once loaded, use the loaded image dimensions stored in `loadedImageDimensions`.
            //
            // By doing this, the image "pops" into the timeline, but is still restricted
            // by the same width and height logic below.
            if (!this.state.loadedImageDimensions) {
                return this.wrapImage(contentUrl,
                    <img style={{display: 'none'}} src={thumbUrl} ref="image"
                        alt={content.body}
                        onError={this.onImageError}
                        onLoad={this.onImageLoad}
                    />,
                );
            }
            infoWidth = this.state.loadedImageDimensions.naturalWidth;
            infoHeight = this.state.loadedImageDimensions.naturalHeight;
        }

        // The maximum height of the thumbnail as it is rendered as an <img>
        const maxHeight = Math.min(this.props.maxImageHeight || 600, infoHeight);
        // The maximum width of the thumbnail, as dictated by its natural
        // maximum height.
        const maxWidth = infoWidth * maxHeight / infoHeight;

        let img = null;
        let placeholder = null;

        // e2e image hasn't been decrypted yet
        if (content.file !== undefined && this.state.decryptedUrl === null) {
            placeholder = <img src="img/spinner.gif" alt={content.body} width="32" height="32" />;
        } else if (!this.state.imgLoaded) {
            // Deliberately, getSpinner is left unimplemented here, MStickerBody overides
            placeholder = this.getPlaceholder();
        }

        const showPlaceholder = Boolean(placeholder);

        if (thumbUrl && !this.state.imgError) {
            // Restrict the width of the thumbnail here, otherwise it will fill the container
            // which has the same width as the timeline
            // mx_MImageBody_thumbnail resizes img to exactly container size
            img = <img className="mx_MImageBody_thumbnail" src={thumbUrl} ref="image"
                style={{ maxWidth: maxWidth + "px" }}
                alt={content.body}
                onError={this.onImageError}
                onLoad={this.onImageLoad}
                onMouseEnter={this.onImageEnter}
                onMouseLeave={this.onImageLeave} />;
        }

        const thumbnail = (
            <div className="mx_MImageBody_thumbnail_container" style={{ maxHeight: maxHeight + "px" }} >
                { /* Calculate aspect ratio, using %padding will size _container correctly */ }
                <div style={{ paddingBottom: (100 * infoHeight / infoWidth) + '%' }} />

                { showPlaceholder &&
                    <div className="mx_MImageBody_thumbnail" style={{
                        // Constrain width here so that spinner appears central to the loaded thumbnail
                        maxWidth: infoWidth + "px",
                    }}>
                        <div className="mx_MImageBody_thumbnail_spinner">
                            { placeholder }
                        </div>
                    </div>
                }

                <div style={{display: !showPlaceholder ? undefined : 'none'}}>
                    { img }
                </div>

                { this.state.hover && this.getTooltip() }
            </div>
        );

        return this.wrapImage(contentUrl, thumbnail);
    }

    // Overidden by MStickerBody
    wrapImage(contentUrl, children) {
        return <a href={contentUrl} onClick={this.onClick}>
            {children}
        </a>;
    }

    // Overidden by MStickerBody
    getPlaceholder() {
        // MImageBody doesn't show a placeholder whilst the image loads, (but it could do)
        return null;
    }

    // Overidden by MStickerBody
    getTooltip() {
        return null;
    }

    // Overidden by MStickerBody
    getFileBody() {
        return <MFileBody {...this.props} decryptedBlob={this.state.decryptedBlob} />;
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

        const contentUrl = this._getContentUrl();
        let thumbUrl;
        if (this._isGif() && SettingsStore.getValue("autoplayGifsAndVideos")) {
          thumbUrl = contentUrl;
        } else {
          thumbUrl = this._getThumbUrl();
        }

        const thumbnail = this._messageContent(contentUrl, thumbUrl, content);
        const fileBody = this.getFileBody();

        return <span className="mx_MImageBody" ref="body">
            { thumbnail }
            { fileBody }
        </span>;
    }
}
