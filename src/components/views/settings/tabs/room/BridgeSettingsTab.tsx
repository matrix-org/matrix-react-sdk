/*
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React, { ReactNode } from "react";
import { Room, MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../../../languageHandler";
import BridgeTile from "../../BridgeTile";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";

const BRIDGE_EVENT_TYPES = [
    "uk.half-shot.bridge",
    // m.bridge
];

const BRIDGES_LINK = "https://matrix.org/bridges/";

interface IProps {
    room: Room;
}

export default class BridgeSettingsTab extends React.Component<IProps> {
    public static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;

    private renderBridgeCard(event: MatrixEvent, room: Room | null): ReactNode {
        const content = event.getContent();
        if (!room || !content?.channel || !content.protocol) return null;
        return <BridgeTile key={event.getId()} room={room} ev={event} />;
    }

    public static getBridgeStateEvents(client: MatrixClient, roomId: string): MatrixEvent[] {
        const roomState = client.getRoom(roomId)?.currentState;
        if (!roomState) return [];

        return BRIDGE_EVENT_TYPES.map((typeName) => roomState.getStateEvents(typeName)).flat(1);
    }

    public render(): React.ReactNode {
        // This settings tab will only be invoked if the following function returns more
        // than 0 events, so no validation is needed at this stage.
        const bridgeEvents = BridgeSettingsTab.getBridgeStateEvents(this.context, this.props.room.roomId);
        const room = this.props.room;

        let content: JSX.Element;
        if (bridgeEvents.length > 0) {
            content = (
                <div>
                    <p>
                        {_t(
                            "room_settings|bridges|description",
                            {},
                            {
                                // TODO: We don't have this link yet: this will prevent the translators
                                // having to re-translate the string when we do.
                                a: (sub) => (
                                    <a href={BRIDGES_LINK} target="_blank" rel="noreferrer noopener">
                                        {sub}
                                    </a>
                                ),
                            },
                        )}
                    </p>
                    <ul className="mx_RoomSettingsDialog_BridgeList">
                        {bridgeEvents.map((event) => this.renderBridgeCard(event, room))}
                    </ul>
                </div>
            );
        } else {
            content = (
                <p>
                    {_t(
                        "room_settings|bridges|empty",
                        {},
                        {
                            // TODO: We don't have this link yet: this will prevent the translators
                            // having to re-translate the string when we do.
                            a: (sub) => (
                                <a href={BRIDGES_LINK} target="_blank" rel="noreferrer noopener">
                                    {sub}
                                </a>
                            ),
                        },
                    )}
                </p>
            );
        }

        return (
            <SettingsTab>
                <SettingsSection heading={_t("room_settings|bridges|title")}>{content}</SettingsSection>
            </SettingsTab>
        );
    }
}
