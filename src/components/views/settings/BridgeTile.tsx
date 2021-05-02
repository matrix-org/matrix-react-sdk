/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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
import {_t} from "../../../languageHandler";
import Pill from "../elements/Pill";
import {makeUserPermalink} from "../../../utils/permalinks/Permalinks";
import BaseAvatar from "../avatars/BaseAvatar";
import SettingsStore from "../../../settings/SettingsStore";
import {MatrixEvent} from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { isUrlPermitted } from '../../../HtmlUtils';
import {replaceableComponent} from "../../../utils/replaceableComponent";
import {mediaFromMxc} from "../../../customisations/Media";

interface IProps {
    ev: MatrixEvent;
    room: Room;
}

/**
 * This should match https://github.com/matrix-org/matrix-doc/blob/hs/msc-bridge-inf/proposals/2346-bridge-info-state-event.md#mbridge
 */
interface IBridgeStateEvent {
    bridgebot: string;
    creator?: string;
    protocol: {
        id: string;
        displayname?: string;
        // eslint-disable-next-line camelcase
        avatar_url?: string;
        // eslint-disable-next-line camelcase
        external_url?: string;
    };
    network?: {
        id: string;
        displayname?: string;
        // eslint-disable-next-line camelcase
        avatar_url?: string;
        // eslint-disable-next-line camelcase
        external_url?: string;
    };
    channel: {
        id: string;
        displayname?: string;
        // eslint-disable-next-line camelcase
        avatar_url?: string;
        // eslint-disable-next-line camelcase
        external_url?: string;
    };
}

@replaceableComponent("views.settings.BridgeTile")
export default class BridgeTile extends React.PureComponent<IProps> {
    static propTypes = {
        ev: PropTypes.object.isRequired,
        room: PropTypes.object.isRequired,
    }

    render() {
        const content: IBridgeStateEvent = this.props.ev.getContent();
        // Validate
        if (!content.channel?.id || !content.protocol?.id) {
            console.warn(`Bridge info event ${this.props.ev.getId()} has missing content. Tile will not render`);
            return null;
        }
        if (!content.bridgebot) {
            // Bridgebot was not required previously, so in order to not break rooms we are allowing
            // the sender to be used in place. When the proposal is merged, this should be removed.
            console.warn(`Bridge info event ${this.props.ev.getId()} does not provide a 'bridgebot' key which`
             + "is deprecated behaviour. Using sender for now.");
            content.bridgebot = this.props.ev.getSender();
        }
        const { channel, network, protocol } = content;
        const protocolName = protocol.displayname || protocol.id;
        const channelName = channel.displayname || channel.id;

        let creator = null;
        if (content.creator) {
            creator = <li>{_t("This bridge was provisioned by <user />.", {}, {
                user: () => <Pill
                    type={Pill.TYPE_USER_MENTION}
                    room={this.props.room}
                    url={makeUserPermalink(content.creator)}
                    shouldShowPillAvatar={SettingsStore.getValue("Pill.shouldShowPillAvatar")}
                />,
            })}</li>;
        }

        const bot = <li>{_t("This bridge is managed by <user />.", {}, {
            user: () => <Pill
                type={Pill.TYPE_USER_MENTION}
                room={this.props.room}
                url={makeUserPermalink(content.bridgebot)}
                shouldShowPillAvatar={SettingsStore.getValue("Pill.shouldShowPillAvatar")}
            />,
        })}</li>;

        let networkIcon;

        if (protocol.avatar_url) {
            const avatarUrl = mediaFromMxc(protocol.avatar_url).getSquareThumbnailHttp(64);

            networkIcon = <BaseAvatar className="protocol-icon"
                width={48}
                height={48}
                resizeMethod='crop'
                name={ protocolName }
                idName={ protocolName }
                url={ avatarUrl }
            />;
        } else {
            networkIcon = <div className="noProtocolIcon"></div>;
        }
        let networkItem = null;
        if (network) {
            const networkName = network.displayname || network.id;
            let networkLink = <span>{networkName}</span>;
            if (typeof network.external_url === "string" && isUrlPermitted(network.external_url)) {
                networkLink = <a href={network.external_url} target="_blank" rel="noreferrer noopener">{networkName}</a>
            }
            networkItem = _t("Workspace: <networkLink/>", {}, {
                networkLink: () => networkLink,
            });
        }

        let channelLink = <span>{channelName}</span>;
        if (typeof channel.external_url === "string" && isUrlPermitted(channel.external_url)) {
            channelLink = <a href={channel.external_url} target="_blank" rel="noreferrer noopener">{channelName}</a>
        }

        const id = this.props.ev.getId();
        return (<li key={id}>
            <div className="column-icon">
                {networkIcon}
            </div>
            <div className="column-data">
                <h3>{protocolName}</h3>
                <p className="workspace-channel-details">
                    {networkItem}
                    <span className="channel">{_t("Channel: <channelLink/>", {}, {
                        channelLink: () => channelLink,
                    })}</span>
                </p>
                <ul className="metadata">
                    {creator} {bot}
                </ul>
            </div>
        </li>);
    }
}
