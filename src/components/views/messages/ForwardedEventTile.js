/*
Copyright 2020 Tulir Asokan <tulir@maunium.net>

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
import { MatrixEvent } from "matrix-js-sdk";
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import * as sdk from "../../../index";
import * as Avatar from '../../../Avatar';
import SettingsStore from "../../../settings/SettingsStore"

const AVATAR_SIZE = 32;

export default class ForwardedEventTile extends React.Component {
    static propTypes = {
        mxEvent: PropTypes.instanceOf(MatrixEvent).isRequired,
    }

    constructor(props) {
        super(props);
        const contentCopy = {...props.mxEvent.getWireContent()};
        const forwardMeta = contentCopy["net.maunium.msc2730.forwarded"];
        delete contentCopy["net.maunium.msc2730.forwarded"]
        const forwardVerification = props.mxEvent.getUnsigned()["net.maunium.msc2730.forwarded"] || {};
        this.state = {
            evt: new MatrixEvent({
                ...forwardMeta,
                content: contentCopy,
                event_id: forwardVerification.event_id,
                type: props.mxEvent.getType(),
            }),
            senderProfile: {
                name: forwardMeta.sender,
                getAvatarUrl: (..._) => null,
            },
        }
        if (forwardMeta.unsigned && forwardMeta.unsigned.displayname) {
            this.state.senderProfile.name = forwardMeta.unsigned.displayname
            this.state.senderProfile.getAvatarUrl = (..._) =>  forwardMeta.unsigned.avatar_url;
        }
    }

    async componentDidMount() {
        const client = MatrixClientPeg.get();
        const profileInfo = await client.getProfileInfo(this.state.evt.getSender());
        const avatar_url = Avatar.avatarUrlForUser(
            {avatarUrl: profileInfo.avatar_url},
            AVATAR_SIZE, AVATAR_SIZE, "crop");
        this.setState({
            senderProfile: {
                name: profileInfo.displayname,
                getAvatarUrl: (..._) => avatar_url,
            }
        })
    }

    render() {
        const EventTile = sdk.getComponent('views.rooms.EventTile');
        this.state.evt.sender = {
            ...this.state.senderProfile,
            userId: this.state.evt.getSender(),
        }
        return <blockquote className="mx_ForwardedEvent" key={this.props.mxEvent.getId()}>
            <EventTile
                mxEvent={this.state.evt}
                tileShape="reply"
                onHeightChanged={this.props.onHeightChanged}
                permalinkCreator={this.props.permalinkCreator}
                isRedacted={false}
                isTwelveHour={SettingsStore.getValue("showTwelveHourTimestamps")}
                useIRCLayout={this.props.useIRCLayout}
            />
        </blockquote>;
    }
}
