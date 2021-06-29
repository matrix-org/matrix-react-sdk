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

import React, { createRef } from 'react';
import PropTypes from 'prop-types';
import SettingsStore from "../../../settings/SettingsStore";
import { Mjolnir } from "../../../mjolnir/Mjolnir";
import RedactedBody from "./RedactedBody";
import UnknownBody from "./UnknownBody";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import TextualBody from "./TextualBody";
import MImageBody from "./MImageBody";
import MFileBody from "./MFileBody";
import MVoiceOrAudioBody from "./MVoiceOrAudioBody";
import MVideoBody from "./MVideoBody";
import MStickerBody from "./MStickerBody";
import MjolnirBody from "./MjolnirBody";

@replaceableComponent("views.messages.MessageEvent")
export default class MessageEvent extends React.Component {
    static propTypes = {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,

        /* a list of words to highlight */
        highlights: PropTypes.array,

        /* link URL for the highlights */
        highlightLink: PropTypes.string,

        /* should show URL previews for this event */
        showUrlPreview: PropTypes.bool,

        /* callback called when dynamic content in events are loaded */
        onHeightChanged: PropTypes.func,

        /* the shape of the tile, used */
        tileShape: PropTypes.string,

        /* the maximum image height to use, if the event is an image */
        maxImageHeight: PropTypes.number,

        /* the permalinkCreator */
        permalinkCreator: PropTypes.object,
    };

    constructor(props) {
        super(props);

        this._body = createRef();
    }

    getEventTileOps = () => {
        return this._body.current && this._body.current.getEventTileOps ? this._body.current.getEventTileOps() : null;
    };

    onTileUpdate = () => {
        this.forceUpdate();
    };

    render() {
        const bodyTypes = {
            'm.text': TextualBody,
            'm.notice': TextualBody,
            'm.emote': TextualBody,
            'm.image': MImageBody,
            'm.file': MFileBody,
            'm.audio': MVoiceOrAudioBody,
            'm.video': MVideoBody,
        };
        const evTypes = {
            'm.sticker': MStickerBody,
        };

        const content = this.props.mxEvent.getContent();
        const type = this.props.mxEvent.getType();
        const msgtype = content.msgtype;
        let BodyType = RedactedBody;
        if (!this.props.mxEvent.isRedacted()) {
            // only resolve BodyType if event is not redacted
            if (type && evTypes[type]) {
                BodyType = evTypes[type];
            } else if (msgtype && bodyTypes[msgtype]) {
                BodyType = bodyTypes[msgtype];
            } else if (content.url) {
                // Fallback to MFileBody if there's a content URL
                BodyType = bodyTypes['m.file'];
            } else {
                // Fallback to UnknownBody otherwise if not redacted
                BodyType = UnknownBody;
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

        return <BodyType
            ref={this._body}
            mxEvent={this.props.mxEvent}
            highlights={this.props.highlights}
            highlightLink={this.props.highlightLink}
            showUrlPreview={this.props.showUrlPreview}
            tileShape={this.props.tileShape}
            maxImageHeight={this.props.maxImageHeight}
            replacingEventId={this.props.replacingEventId}
            editState={this.props.editState}
            onHeightChanged={this.props.onHeightChanged}
            onMessageAllowed={this.onTileUpdate}
            permalinkCreator={this.props.permalinkCreator}
        />;
    }
}
