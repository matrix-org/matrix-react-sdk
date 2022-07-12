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

import React, { createRef } from 'react';
import { EventType, MsgType } from "matrix-js-sdk/src/@types/event";
import { Relations } from 'matrix-js-sdk/src/models/relations';
import { M_BEACON_INFO } from 'matrix-js-sdk/src/@types/beacon';
import { M_LOCATION } from 'matrix-js-sdk/src/@types/location';
import { M_POLL_START } from "matrix-events-sdk";
import { MatrixEventEvent } from "matrix-js-sdk/src/models/event";

import SettingsStore from "../../../settings/SettingsStore";
import { Mjolnir } from "../../../mjolnir/Mjolnir";
import RedactedBody from "./RedactedBody";
import UnknownBody from "./UnknownBody";
import { IMediaBody } from "./IMediaBody";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import { ReactAnyComponent } from "../../../@types/common";
import { IBodyProps } from "./IBodyProps";
import MatrixClientContext from '../../../contexts/MatrixClientContext';
import TextualBody from "./TextualBody";
import MImageBody from "./MImageBody";
import MFileBody from "./MFileBody";
import MVoiceOrAudioBody from "./MVoiceOrAudioBody";
import MVideoBody from "./MVideoBody";
import MStickerBody from "./MStickerBody";
import MPollBody from "./MPollBody";
import MLocationBody from "./MLocationBody";
import MjolnirBody from "./MjolnirBody";
import MBeaconBody from "./MBeaconBody";
import { IEventTileOps } from "../rooms/EventTile";

// onMessageAllowed is handled internally
interface IProps extends Omit<IBodyProps, "onMessageAllowed" | "mediaEventHelper"> {
    /* overrides for the msgtype-specific components, used by ReplyTile to override file rendering */
    overrideBodyTypes?: Record<string, typeof React.Component>;
    overrideEventTypes?: Record<string, typeof React.Component>;

    // helper function to access relations for this event
    getRelationsForEvent?: (eventId: string, relationType: string, eventType: string) => Relations;

    isSeeingThroughMessageHiddenForModeration?: boolean;
}

export interface IOperableEventTile {
    getEventTileOps(): IEventTileOps;
}

export default class MessageEvent extends React.Component<IProps> implements IMediaBody, IOperableEventTile {
    private body: React.RefObject<React.Component | IOperableEventTile> = createRef();
    private mediaHelper: MediaEventHelper;

    static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;

    public constructor(props: IProps, context: React.ContextType<typeof MatrixClientContext>) {
        super(props, context);

        if (MediaEventHelper.isEligible(this.props.mxEvent)) {
            this.mediaHelper = new MediaEventHelper(this.props.mxEvent);
        }
    }

    public componentDidMount(): void {
        this.props.mxEvent.addListener(MatrixEventEvent.Decrypted, this.onDecrypted);
    }

    public componentWillUnmount() {
        this.props.mxEvent.removeListener(MatrixEventEvent.Decrypted, this.onDecrypted);
        this.mediaHelper?.destroy();
    }

    public componentDidUpdate(prevProps: Readonly<IProps>) {
        if (this.props.mxEvent !== prevProps.mxEvent && MediaEventHelper.isEligible(this.props.mxEvent)) {
            this.mediaHelper?.destroy();
            this.mediaHelper = new MediaEventHelper(this.props.mxEvent);
        }
    }

    private get bodyTypes(): Record<string, typeof React.Component> {
        return {
            [MsgType.Text]: TextualBody,
            [MsgType.Notice]: TextualBody,
            [MsgType.Emote]: TextualBody,
            [MsgType.Image]: MImageBody,
            [MsgType.File]: MFileBody,
            [MsgType.Audio]: MVoiceOrAudioBody,
            [MsgType.Video]: MVideoBody,

            ...(this.props.overrideBodyTypes || {}),
        };
    }

    private get evTypes(): Record<string, React.ComponentType<Partial<IBodyProps>>> {
        return {
            [EventType.Sticker]: MStickerBody,
            [M_POLL_START.name]: MPollBody,
            [M_POLL_START.altName]: MPollBody,
            [M_BEACON_INFO.name]: MBeaconBody,
            [M_BEACON_INFO.altName]: MBeaconBody,

            ...(this.props.overrideEventTypes || {}),
        };
    }

    public getEventTileOps = () => {
        return (this.body.current as IOperableEventTile)?.getEventTileOps?.() || null;
    };

    public getMediaHelper() {
        return this.mediaHelper;
    }

    private onDecrypted = (): void => {
        // Recheck MediaEventHelper eligibility as it can change when the event gets decrypted
        if (MediaEventHelper.isEligible(this.props.mxEvent)) {
            this.mediaHelper?.destroy();
            this.mediaHelper = new MediaEventHelper(this.props.mxEvent);
        }
    };

    private onTileUpdate = () => {
        this.forceUpdate();
    };

    public render() {
        const content = this.props.mxEvent.getContent();
        const type = this.props.mxEvent.getType();
        const msgtype = content.msgtype;
        let BodyType: React.ComponentType<Partial<IBodyProps>> | ReactAnyComponent = RedactedBody;
        if (!this.props.mxEvent.isRedacted()) {
            // only resolve BodyType if event is not redacted
            if (type && this.evTypes[type]) {
                BodyType = this.evTypes[type];
            } else if (msgtype && this.bodyTypes[msgtype]) {
                BodyType = this.bodyTypes[msgtype];
            } else if (content.url) {
                // Fallback to MFileBody if there's a content URL
                BodyType = this.bodyTypes[MsgType.File];
            } else {
                // Fallback to UnknownBody otherwise if not redacted
                BodyType = UnknownBody;
            }

            // TODO: move to eventTypes when location sharing spec stabilises
            if (
                M_LOCATION.matches(type) ||
                (type === EventType.RoomMessage && msgtype === MsgType.Location)
            ) {
                BodyType = MLocationBody;
            }
        }

        if (SettingsStore.getValue("feature_mjolnir")) {
            const key = `mx_mjolnir_render_${this.props.mxEvent.getRoomId()}__${this.props.mxEvent.getId()}`;
            const allowRender = localStorage.getItem(key) === "true";

            if (!allowRender) {
                const userDomain = this.props.mxEvent.getSender().split(':').slice(1).join(':');
                const userBanned = Mjolnir.sharedInstance().isUserBanned(this.props.mxEvent.getSender());
                const serverBanned = Mjolnir.sharedInstance().isServerBanned(userDomain);

                if (userBanned || serverBanned) {
                    BodyType = MjolnirBody;
                }
            }
        }

        // @ts-ignore - this is a dynamic react component
        return BodyType ? <BodyType
            ref={this.body}
            mxEvent={this.props.mxEvent}
            highlights={this.props.highlights}
            highlightLink={this.props.highlightLink}
            showUrlPreview={this.props.showUrlPreview}
            forExport={this.props.forExport}
            maxImageHeight={this.props.maxImageHeight}
            replacingEventId={this.props.replacingEventId}
            editState={this.props.editState}
            onHeightChanged={this.props.onHeightChanged}
            onMessageAllowed={this.onTileUpdate}
            permalinkCreator={this.props.permalinkCreator}
            mediaEventHelper={this.mediaHelper}
            getRelationsForEvent={this.props.getRelationsForEvent}
            isSeeingThroughMessageHiddenForModeration={this.props.isSeeingThroughMessageHiddenForModeration}
        /> : null;
    }
}
