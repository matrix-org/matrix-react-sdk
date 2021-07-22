/*
Copyright 2015 - 2021 The Matrix.org Foundation C.I.C.

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
import { decode } from "blurhash";

import { _t } from '../../../languageHandler';
import SettingsStore from "../../../settings/SettingsStore";
import InlineSpinner from '../elements/InlineSpinner';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { mediaFromContent } from "../../../customisations/Media";
import { BLURHASH_FIELD } from "../../../ContentMessages";
import { IMediaEventContent } from "../../../customisations/models/IMediaEventContent";
import { IBodyProps } from "./IBodyProps";
import MFileBody from "./MFileBody";

interface IState {
    decryptedUrl?: string;
    decryptedThumbnailUrl?: string;
    decryptedBlob?: Blob;
    error?: any;
    fetchingData: boolean;
    posterLoading: boolean;
    blurhashUrl: string;
}

@replaceableComponent("views.messages.MVideoBody")
export default class MVideoBody extends React.PureComponent<IBodyProps, IState> {
    private videoRef = React.createRef<HTMLVideoElement>();

    constructor(props) {
        super(props);

        this.state = {
            fetchingData: false,
            decryptedUrl: null,
            decryptedThumbnailUrl: null,
            decryptedBlob: null,
            error: null,
            posterLoading: false,
            blurhashUrl: null,
        };
    }

    thumbScale(fullWidth: number, fullHeight: number, thumbWidth = 480, thumbHeight = 360) {
        if (!fullWidth || !fullHeight) {
            // Cannot calculate thumbnail height for image: missing w/h in metadata. We can't even
            // log this because it's spammy
            return undefined;
        }
        if (fullWidth < thumbWidth && fullHeight < thumbHeight) {
            // no scaling needs to be applied
            return 1;
        }
        const widthMulti = thumbWidth / fullWidth;
        const heightMulti = thumbHeight / fullHeight;
        if (widthMulti < heightMulti) {
            // width is the dominant dimension so scaling will be fixed on that
            return widthMulti;
        } else {
            // height is the dominant dimension so scaling will be fixed on that
            return heightMulti;
        }
    }

    private getContentUrl(): string|null {
        const media = mediaFromContent(this.props.mxEvent.getContent());
        if (media.isEncrypted) {
            return this.state.decryptedUrl;
        } else {
            return media.srcHttp;
        }
    }

    private hasContentUrl(): boolean {
        const url = this.getContentUrl();
        return url && !url.startsWith("data:");
    }

    private getThumbUrl(): string|null {
        const content = this.props.mxEvent.getContent<IMediaEventContent>();
        const media = mediaFromContent(content);

        if (media.isEncrypted && this.state.decryptedThumbnailUrl) {
            return this.state.decryptedThumbnailUrl;
        } else if (this.state.posterLoading) {
            return this.state.blurhashUrl;
        } else if (media.hasThumbnail) {
            return media.thumbnailHttp;
        } else {
            return null;
        }
    }

    private loadBlurhash() {
        const info = this.props.mxEvent.getContent()?.info;
        if (!info[BLURHASH_FIELD]) return;

        const canvas = document.createElement("canvas");

        let width = info.w;
        let height = info.h;
        const scale = this.thumbScale(info.w, info.h);
        if (scale) {
            width = Math.floor(info.w * scale);
            height = Math.floor(info.h * scale);
        }

        canvas.width = width;
        canvas.height = height;

        const pixels = decode(info[BLURHASH_FIELD], width, height);
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(width, height);
        imgData.data.set(pixels);
        ctx.putImageData(imgData, 0, 0);

        this.setState({
            blurhashUrl: canvas.toDataURL(),
            posterLoading: true,
        });

        const content = this.props.mxEvent.getContent<IMediaEventContent>();
        const media = mediaFromContent(content);
        if (media.hasThumbnail) {
            const image = new Image();
            image.onload = () => {
                this.setState({ posterLoading: false });
            };
            image.src = media.thumbnailHttp;
        }
    }

    async componentDidMount() {
        const autoplay = SettingsStore.getValue("autoplayGifsAndVideos") as boolean;
        this.loadBlurhash();

        if (this.props.mediaEventHelper.media.isEncrypted && this.state.decryptedUrl === null) {
            try {
                const thumbnailUrl = await this.props.mediaEventHelper.thumbnailUrl.value;
                if (autoplay) {
                    console.log("Preloading video");
                    this.setState({
                        decryptedUrl: await this.props.mediaEventHelper.sourceUrl.value,
                        decryptedThumbnailUrl: thumbnailUrl,
                        decryptedBlob: await this.props.mediaEventHelper.sourceBlob.value,
                    });
                    this.props.onHeightChanged();
                } else {
                    console.log("NOT preloading video");
                    const content = this.props.mxEvent.getContent<IMediaEventContent>();
                    this.setState({
                        // For Chrome and Electron, we need to set some non-empty `src` to
                        // enable the play button. Firefox does not seem to care either
                        // way, so it's fine to do for all browsers.
                        decryptedUrl: `data:${content?.info?.mimetype},`,
                        decryptedThumbnailUrl: thumbnailUrl || `data:${content?.info?.mimetype},`,
                        decryptedBlob: null,
                    });
                }
            } catch (err) {
                console.warn("Unable to decrypt attachment: ", err);
                // Set a placeholder image when we can't decrypt the image.
                this.setState({
                    error: err,
                });
            }
        }
    }

    private videoOnPlay = async () => {
        if (this.hasContentUrl() || this.state.fetchingData || this.state.error) {
            // We have the file, we are fetching the file, or there is an error.
            return;
        }
        this.setState({
            // To stop subsequent download attempts
            fetchingData: true,
        });
        if (!this.props.mediaEventHelper.media.isEncrypted) {
            this.setState({
                error: "No file given in content",
            });
            return;
        }
        this.setState({
            decryptedUrl: await this.props.mediaEventHelper.sourceUrl.value,
            decryptedBlob: await this.props.mediaEventHelper.sourceBlob.value,
            fetchingData: false,
        }, () => {
            if (!this.videoRef.current) return;
            this.videoRef.current.play();
        });
        this.props.onHeightChanged();
    };

    render() {
        const content = this.props.mxEvent.getContent();
        const autoplay = SettingsStore.getValue("autoplayGifsAndVideos");

        if (this.state.error !== null) {
            return (
                <span className="mx_MVideoBody">
                    <img src={require("../../../../res/img/warning.svg")} width="16" height="16" />
                    { _t("Error decrypting video") }
                </span>
            );
        }

        // Important: If we aren't autoplaying and we haven't decrypred it yet, show a video with a poster.
        if (content.file !== undefined && this.state.decryptedUrl === null && autoplay) {
            // Need to decrypt the attachment
            // The attachment is decrypted in componentDidMount.
            // For now add an img tag with a spinner.
            return (
                <span className="mx_MVideoBody">
                    <div className="mx_MImageBody_thumbnail mx_MImageBody_thumbnail_spinner">
                        <InlineSpinner />
                    </div>
                </span>
            );
        }

        const contentUrl = this.getContentUrl();
        const thumbUrl = this.getThumbUrl();
        let height = null;
        let width = null;
        let poster = null;
        let preload = "metadata";
        if (content.info) {
            const scale = this.thumbScale(content.info.w, content.info.h);
            if (scale) {
                width = Math.floor(content.info.w * scale);
                height = Math.floor(content.info.h * scale);
            }

            if (thumbUrl) {
                poster = thumbUrl;
                preload = "none";
            }
        }
        return (
            <span className="mx_MVideoBody">
                <video
                    className="mx_MVideoBody"
                    ref={this.videoRef}
                    src={contentUrl}
                    title={content.body}
                    controls
                    preload={preload}
                    muted={autoplay}
                    autoPlay={autoplay}
                    height={height}
                    width={width}
                    poster={poster}
                    onPlay={this.videoOnPlay}
                >
                </video>
                { this.props.tileShape && <MFileBody {...this.props} showGenericPlaceholder={false} /> }
            </span>
        );
    }
}
