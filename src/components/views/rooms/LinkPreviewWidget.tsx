/*
Copyright 2016 - 2021 The Matrix.org Foundation C.I.C.

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

import React, { ComponentProps, createRef, ReactNode } from 'react';
import { AllHtmlEntities } from 'html-entities';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { IPreviewUrlResponse } from 'matrix-js-sdk/src/client';

import { linkifyElement } from '../../../HtmlUtils';
import SettingsStore from "../../../settings/SettingsStore";
import Modal from "../../../Modal";
import * as ImageUtils from "../../../ImageUtils";
import { mediaFromMxc } from "../../../customisations/Media";
import ImageView from '../elements/ImageView';

export interface IPreview {
    title: string;
    summary?: string;
    description: ReactNode;
    avatarUrl: string;
}

export type Preview = IPreviewUrlResponse | IPreview;

interface IProps {
    link: string;
    preview: Preview;
    mxEvent: MatrixEvent; // the Event associated with the preview
}

export default class LinkPreviewWidget extends React.Component<IProps> {
    private readonly description = createRef<HTMLDivElement>();
    private image = createRef<HTMLImageElement>();

    componentDidMount() {
        if (this.description.current) {
            linkifyElement(this.description.current);
        }
    }

    componentDidUpdate() {
        if (this.description.current) {
            linkifyElement(this.description.current);
        }
    }

    private onImageClick = ev => {
        const p = this.props.preview;
        if (ev.button != 0 || ev.metaKey) return;
        ev.preventDefault();

        let src = p["og:image"];
        if (src && src.startsWith("mxc://")) {
            src = mediaFromMxc(src).srcHttp;
        }

        const params: Omit<ComponentProps<typeof ImageView>, "onFinished"> = {
            src: src,
            width: p["og:image:width"],
            height: p["og:image:height"],
            name: p["og:title"] || p["og:description"] || this.props.link,
            fileSize: p["matrix:image:size"],
            link: this.props.link,
        };

        if (this.image.current) {
            const clientRect = this.image.current.getBoundingClientRect();

            params.thumbnailInfo = {
                width: clientRect.width,
                height: clientRect.height,
                positionX: clientRect.x,
                positionY: clientRect.y,
            };
        }

        Modal.createDialog(ImageView, params, "mx_Dialog_lightbox", null, true);
    };

    private get preview(): IPreview {
        if (this.props.preview.title) {
            return this.props.preview as IPreview;
        }

        return {
            title: this.props.preview["og:title"],
            summary: this.props.preview["og:site_name"],
            // The description includes &-encoded HTML entities, we decode those as React treats the thing as an
            // opaque string. This does not allow any HTML to be injected into the DOM.
            description: AllHtmlEntities.decode(this.props.preview["og:description"] ?? ""),
            avatarUrl: this.props.preview["og:image"],
        };
    }

    render() {
        if (Object.keys(this.props.preview).length === 0) {
            return <div />;
        }

        const preview = this.preview;
        // FIXME: do we want to factor out all image displaying between this and MImageBody - especially for lightboxing?
        let image = preview.avatarUrl;
        if (!SettingsStore.getValue("showImages")) {
            image = null; // Don't render a button to show the image, just hide it outright
        }
        const imageMaxWidth = 100;
        const imageMaxHeight = 100;
        if (image?.startsWith("mxc://")) {
            // We deliberately don't want a square here, so use the source HTTP thumbnail function
            image = mediaFromMxc(image).getThumbnailOfSourceHttp(imageMaxWidth, imageMaxHeight, 'scale');
        }

        let thumbHeight = imageMaxHeight;
        if (this.props.preview["og:image:width"] && this.props.preview["og:image:height"]) {
            thumbHeight = ImageUtils.thumbHeight(
                this.props.preview["og:image:width"],
                this.props.preview["og:image:height"],
                imageMaxWidth,
                imageMaxHeight,
            );
        }

        let img: JSX.Element;
        if (image) {
            img = <div className="mx_LinkPreviewWidget_image" style={{ height: thumbHeight }}>
                <img
                    ref={this.image}
                    style={{ maxWidth: imageMaxWidth, maxHeight: imageMaxHeight }}
                    src={image}
                    onClick={this.onImageClick}
                />
            </div>;
        }

        return (
            <div className="mx_LinkPreviewWidget">
                { img }
                <div className="mx_LinkPreviewWidget_caption">
                    <div className="mx_LinkPreviewWidget_title">
                        <a href={this.props.link} target="_blank" rel="noreferrer noopener">{ preview.title }</a>
                        { preview.summary && <span className="mx_LinkPreviewWidget_siteName">
                            { (" - " + preview.summary) }
                        </span> }
                    </div>
                    <div className="mx_LinkPreviewWidget_description" ref={this.description}>
                        { preview.description }
                    </div>
                </div>
                { this.props.children }
            </div>
        );
    }
}
