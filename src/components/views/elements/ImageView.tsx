/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2020, 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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

import React, { createRef } from 'react';
import { _t } from '../../../languageHandler';
import AccessibleTooltipButton from "./AccessibleTooltipButton";
import {Key} from "../../../Keyboard";
import FocusLock from "react-focus-lock";
import MemberAvatar from "../avatars/MemberAvatar";
import {ContextMenuTooltipButton} from "../../../accessibility/context_menu/ContextMenuTooltipButton";
import MessageContextMenu from "../context_menus/MessageContextMenu";
import {aboveLeftOf, ContextMenu} from '../../structures/ContextMenu';
import MessageTimestamp from "../messages/MessageTimestamp";
import SettingsStore from "../../../settings/SettingsStore";
import {formatFullDate} from "../../../DateUtils";
import dis from '../../../dispatcher/dispatcher';
import {replaceableComponent} from "../../../utils/replaceableComponent";
import {RoomPermalinkCreator} from "../../../utils/permalinks/Permalinks"
import {MatrixEvent} from "matrix-js-sdk/src/models/event";
import {normalizeWheelEvent} from "../../../utils/Mouse";

// Max scale to keep gaps around the image
const MAX_SCALE = 0.95;
// This is used for the buttons
const ZOOM_STEP = 0.10;
// This is used for mouse wheel events
const ZOOM_COEFFICIENT = 0.0025;
// If we have moved only this much we can zoom
const ZOOM_DISTANCE = 10;

interface IProps {
    src: string, // the source of the image being displayed
    name?: string, // the main title ('name') for the image
    link?: string, // the link (if any) applied to the name of the image
    width?: number, // width of the image src in pixels
    height?: number, // height of the image src in pixels
    fileSize?: number, // size of the image src in bytes
    onFinished(): void, // callback when the lightbox is dismissed

    // the event (if any) that the Image is displaying. Used for event-specific stuff like
    // redactions, senders, timestamps etc.  Other descriptors are taken from the explicit
    // properties above, which let us use lightboxes to display images which aren't associated
    // with events.
    mxEvent: MatrixEvent,
    permalinkCreator: RoomPermalinkCreator,
}

interface IState {
    zoom: number,
    minZoom: number,
    maxZoom: number,
    rotation: number,
    translationX: number,
    translationY: number,
    moving: boolean,
    contextMenuDisplayed: boolean,
}

@replaceableComponent("views.elements.ImageView")
export default class ImageView extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);
        this.state = {
            zoom: 0,
            minZoom: MAX_SCALE,
            maxZoom: MAX_SCALE,
            rotation: 0,
            translationX: 0,
            translationY: 0,
            moving: false,
            contextMenuDisplayed: false,
        };
    }

    // XXX: Refs to functional components
    private contextMenuButton = createRef<any>();
    private focusLock = createRef<any>();
    private imageWrapper = createRef<HTMLDivElement>();
    private image = createRef<HTMLImageElement>();

    private initX = 0;
    private initY = 0;
    private lastX = 0;
    private lastY = 0;
    private previousX = 0;
    private previousY = 0;

    componentDidMount() {
        // We have to use addEventListener() because the listener
        // needs to be passive in order to work with Chromium
        this.focusLock.current.addEventListener('wheel', this.onWheel, { passive: false });
        // We want to recalculate zoom whenever the window's size changes
        window.addEventListener("resize", this.calculateZoom);
        // After the image loads for the first time we want to calculate the zoom
        this.image.current.addEventListener("load", this.calculateZoom);
    }

    componentWillUnmount() {
        this.focusLock.current.removeEventListener('wheel', this.onWheel);
        window.removeEventListener("resize", this.calculateZoom);
        this.image.current.removeEventListener("load", this.calculateZoom);
    }

    private calculateZoom = () => {
        const image = this.image.current;
        const imageWrapper = this.imageWrapper.current;

        const zoomX = imageWrapper.clientWidth / image.naturalWidth;
        const zoomY = imageWrapper.clientHeight / image.naturalHeight;

        // If the image is smaller in both dimensions set its the zoom to 1 to
        // display it in its original size
        if (zoomX >= 1 && zoomY >= 1) {
            this.setState({
                zoom: 1,
                minZoom: 1,
                maxZoom: 1,
            });
            return;
        }
        // We set minZoom to the min of the zoomX and zoomY to avoid overflow in
        // any direction. We also multiply by MAX_SCALE to get a gap around the
        // image by default
        const minZoom = Math.min(zoomX, zoomY) * MAX_SCALE;

        if (this.state.zoom <= this.state.minZoom) this.setState({zoom: minZoom});
        this.setState({
            minZoom: minZoom,
            maxZoom: 1,
        });
    }

    private zoom(delta: number) {
        const newZoom = this.state.zoom + delta;

        if (newZoom <= this.state.minZoom) {
            this.setState({
                zoom: this.state.minZoom,
                translationX: 0,
                translationY: 0,
            });
            return;
        }
        if (newZoom >= this.state.maxZoom) {
            this.setState({zoom: this.state.maxZoom});
            return;
        }

        this.setState({
            zoom: newZoom,
        });
    }

    private onWheel = (ev: WheelEvent) => {
        ev.stopPropagation();
        ev.preventDefault();

        const {deltaY} = normalizeWheelEvent(ev);
        this.zoom(-(deltaY * ZOOM_COEFFICIENT));
    };

    private onZoomInClick = () => {
        this.zoom(ZOOM_STEP);
    };

    private onZoomOutClick = () => {
        this.zoom(-ZOOM_STEP);
    };

    private onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === Key.ESCAPE) {
            ev.stopPropagation();
            ev.preventDefault();
            this.props.onFinished();
        }
    };

    private onRotateCounterClockwiseClick = () => {
        const cur = this.state.rotation;
        const rotationDegrees = cur - 90;
        this.setState({ rotation: rotationDegrees });
    };

    private onRotateClockwiseClick = () => {
        const cur = this.state.rotation;
        const rotationDegrees = cur + 90;
        this.setState({ rotation: rotationDegrees });
    };

    private onDownloadClick = () => {
        const a = document.createElement("a");
        a.href = this.props.src;
        a.download = this.props.name;
        a.target = "_blank";
        a.rel = "noreferrer noopener";
        a.click();
    };

    private onOpenContextMenu = () => {
        this.setState({
            contextMenuDisplayed: true,
        });
    };

    private onCloseContextMenu = () => {
        this.setState({
            contextMenuDisplayed: false,
        });
    };

    private onPermalinkClicked = (ev: React.MouseEvent) => {
        // This allows the permalink to be opened in a new tab/window or copied as
        // matrix.to, but also for it to enable routing within Element when clicked.
        ev.preventDefault();
        dis.dispatch({
            action: 'view_room',
            event_id: this.props.mxEvent.getId(),
            highlighted: true,
            room_id: this.props.mxEvent.getRoomId(),
        });
        this.props.onFinished();
    };

    private onStartMoving = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();

        // Don't do anything if we pressed any
        // other button than the left one
        if (ev.button !== 0) return;

        // Zoom in if we are completely zoomed out
        if (this.state.zoom === this.state.minZoom) {
            this.setState({zoom: this.state.maxZoom});
            return;
        }

        this.setState({moving: true});
        this.previousX = this.state.translationX;
        this.previousY = this.state.translationY;
        this.initX = ev.pageX - this.lastX;
        this.initY = ev.pageY - this.lastY;
    };

    private onMoving = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();

        if (!this.state.moving) return;

        this.lastX = ev.pageX - this.initX;
        this.lastY = ev.pageY - this.initY;
        this.setState({
            translationX: this.lastX,
            translationY: this.lastY,
        });
    };

    private onEndMoving = () => {
        // Zoom out if we haven't moved much
        if (
            this.state.moving === true &&
            Math.abs(this.state.translationX - this.previousX) < ZOOM_DISTANCE &&
            Math.abs(this.state.translationY - this.previousY) < ZOOM_DISTANCE
        ) {
            this.setState({
                zoom: this.state.minZoom,
                translationX: 0,
                translationY: 0,
            });
        }
        this.setState({moving: false});
    };

    private renderContextMenu() {
        let contextMenu = null;
        if (this.state.contextMenuDisplayed) {
            contextMenu = (
                <ContextMenu
                    {...aboveLeftOf(this.contextMenuButton.current.getBoundingClientRect())}
                    onFinished={this.onCloseContextMenu}
                >
                    <MessageContextMenu
                        mxEvent={this.props.mxEvent}
                        permalinkCreator={this.props.permalinkCreator}
                        onFinished={this.onCloseContextMenu}
                        onCloseDialog={this.props.onFinished}
                    />
                </ContextMenu>
            );
        }

        return (
            <React.Fragment>
                { contextMenu }
            </React.Fragment>
        );
    }

    render() {
        const showEventMeta = !!this.props.mxEvent;
        const zoomingDisabled = this.state.maxZoom === this.state.minZoom;

        let cursor;
        if (this.state.moving) {
            cursor= "grabbing";
        } else if (zoomingDisabled) {
            cursor = "default";
        } else if (this.state.zoom === this.state.minZoom) {
            cursor = "zoom-in";
        } else {
            cursor = "zoom-out";
        }
        const rotationDegrees = this.state.rotation + "deg";
        const zoom = this.state.zoom;
        const translatePixelsX = this.state.translationX + "px";
        const translatePixelsY = this.state.translationY + "px";
        // The order of the values is important!
        // First, we translate and only then we rotate, otherwise
        // we would apply the translation to an already rotated
        // image causing it translate in the wrong direction.
        const style = {
            cursor: cursor,
            transition: this.state.moving ? null : "transform 200ms ease 0s",
            transform: `translateX(${translatePixelsX})
                        translateY(${translatePixelsY})
                        scale(${zoom})
                        rotate(${rotationDegrees})`,
        };

        let info;
        if (showEventMeta) {
            const mxEvent = this.props.mxEvent;
            const showTwelveHour = SettingsStore.getValue("showTwelveHourTimestamps");
            let permalink = "#";
            if (this.props.permalinkCreator) {
                permalink = this.props.permalinkCreator.forEvent(this.props.mxEvent.getId());
            }

            const senderName = mxEvent.sender ? mxEvent.sender.name : mxEvent.getSender();
            const sender = (
                <div className="mx_ImageView_info_sender">
                    {senderName}
                </div>
            );
            const messageTimestamp = (
                <a
                    href={permalink}
                    onClick={this.onPermalinkClicked}
                    aria-label={formatFullDate(new Date(this.props.mxEvent.getTs()), showTwelveHour, false)}
                >
                    <MessageTimestamp
                        showFullDate={true}
                        showTwelveHour={showTwelveHour}
                        ts={mxEvent.getTs()}
                        showSeconds={false}
                    />
                </a>
            );
            const avatar = (
                <MemberAvatar
                    member={mxEvent.sender}
                    width={32} height={32}
                    viewUserOnClick={true}
                />
            );

            info = (
                <div className="mx_ImageView_info_wrapper">
                    {avatar}
                    <div className="mx_ImageView_info">
                        {sender}
                        {messageTimestamp}
                    </div>
                </div>
            );
        } else {
            // If there is no event - we're viewing an avatar, we set
            // an empty div here, since the panel uses space-between
            // and we want the same placement of elements
            info = (
                <div></div>
            );
        }

        let contextMenuButton;
        if (this.props.mxEvent) {
            contextMenuButton = (
                <ContextMenuTooltipButton
                    className="mx_ImageView_button mx_ImageView_button_more"
                    title={_t("Options")}
                    onClick={this.onOpenContextMenu}
                    inputRef={this.contextMenuButton}
                    isExpanded={this.state.contextMenuDisplayed}
                />
            );
        }

        let zoomOutButton;
        let zoomInButton;
        if (!zoomingDisabled) {
            zoomOutButton = (
                <AccessibleTooltipButton
                    className="mx_ImageView_button mx_ImageView_button_zoomOut"
                    title={_t("Zoom out")}
                    onClick={this.onZoomOutClick}>
                </AccessibleTooltipButton>
            );
            zoomInButton = (
                <AccessibleTooltipButton
                    className="mx_ImageView_button mx_ImageView_button_zoomIn"
                    title={_t("Zoom in")}
                    onClick={ this.onZoomInClick }>
                </AccessibleTooltipButton>
            );
        }

        return (
            <FocusLock
                returnFocus={true}
                lockProps={{
                    onKeyDown: this.onKeyDown,
                    role: "dialog",
                }}
                className="mx_ImageView"
                ref={this.focusLock}
            >
                <div className="mx_ImageView_panel">
                    {info}
                    <div className="mx_ImageView_toolbar">
                        <AccessibleTooltipButton
                            className="mx_ImageView_button mx_ImageView_button_rotateCCW"
                            title={_t("Rotate Left")}
                            onClick={ this.onRotateCounterClockwiseClick }>
                        </AccessibleTooltipButton>
                        <AccessibleTooltipButton
                            className="mx_ImageView_button mx_ImageView_button_rotateCW"
                            title={_t("Rotate Right")}
                            onClick={this.onRotateClockwiseClick}>
                        </AccessibleTooltipButton>
                        {zoomOutButton}
                        {zoomInButton}
                        <AccessibleTooltipButton
                            className="mx_ImageView_button mx_ImageView_button_download"
                            title={_t("Download")}
                            onClick={ this.onDownloadClick }>
                        </AccessibleTooltipButton>
                        {contextMenuButton}
                        <AccessibleTooltipButton
                            className="mx_ImageView_button mx_ImageView_button_close"
                            title={_t("Close")}
                            onClick={ this.props.onFinished }>
                        </AccessibleTooltipButton>
                        {this.renderContextMenu()}
                    </div>
                </div>
                <div
                    className="mx_ImageView_image_wrapper"
                    ref={this.imageWrapper}>
                    <img
                        src={this.props.src}
                        title={this.props.name}
                        style={style}
                        ref={this.image}
                        className="mx_ImageView_image"
                        draggable={true}
                        onMouseDown={this.onStartMoving}
                        onMouseMove={this.onMoving}
                        onMouseUp={this.onEndMoving}
                        onMouseLeave={this.onEndMoving}
                    />
                </div>
            </FocusLock>
        );
    }
}
