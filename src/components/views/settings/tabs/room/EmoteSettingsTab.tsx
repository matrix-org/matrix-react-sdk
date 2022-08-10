/*
Copyright 2019 New Vector Ltd

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

import React, { ContextType } from 'react';

import { _t } from "../../../../../languageHandler";
import RoomEmoteSettings from "../../../room_settings/RoomEmoteSettings";
import AccessibleButton, { ButtonEvent } from "../../../elements/AccessibleButton";
import dis from "../../../../../dispatcher/dispatcher";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import SettingsStore from "../../../../../settings/SettingsStore";
import { UIFeature } from "../../../../../settings/UIFeature";
import UrlPreviewSettings from "../../../room_settings/UrlPreviewSettings";
import AliasSettings from "../../../room_settings/AliasSettings";
import PosthogTrackers from "../../../../../PosthogTrackers";

interface IProps {
    roomId: string;
}

interface IState {
    isRoomPublished: boolean;
}

export default class EmoteRoomSettingsTab extends React.Component<IProps, IState> {
    public static contextType = MatrixClientContext;
    context: ContextType<typeof MatrixClientContext>;

    constructor(props: IProps, context: ContextType<typeof MatrixClientContext>) {
        super(props, context);

        this.state = {
            isRoomPublished: false, // loaded async
        };
    }


    public render(): JSX.Element {
        const client = this.context;
        const room = client.getRoom(this.props.roomId);

        /*const canSetAliases = true; // Previously, we arbitrarily only allowed admins to do this
        const canSetCanonical = room.currentState.mayClientSendStateEvent("m.room.canonical_alias", client);
        const canonicalAliasEv = room.currentState.getStateEvents("m.room.canonical_alias", '');*/

        const urlPreviewSettings = SettingsStore.getValue(UIFeature.URLPreviews) ?
            <UrlPreviewSettings room={room} /> :
            null;


        return (
            <div className="mx_SettingsTab mx_EmoteRoomSettingsTab">

                <div className="mx_SettingsTab_heading">{_t("Emotes")}</div>
                <div className='mx_SettingsTab_section mx_EmoteRoomSettingsTab_profileSection'>
                    <RoomEmoteSettings roomId={this.props.roomId} />
                </div>

            </div>
        );
    }
}
