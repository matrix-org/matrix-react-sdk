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

import React, { createRef } from 'react';
import classNames from "classnames";

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import Field from "../elements/Field";
import { mediaFromMxc } from "../../../customisations/Media";
import AccessibleButton from "../elements/AccessibleButton";
import AvatarSetting from "../settings/AvatarSetting";
import { htmlSerializeFromMdIfNeeded } from '../../../editor/serialize';
import { chromeFileInputFix } from "../../../utils/BrowserWorkarounds";
import { string } from 'prop-types';

interface IProps {
    roomId: string;
}

interface IState {
    emotes: Record<string, string>;
    EmoteFieldsTouched: Record<string, boolean>;
    newEmoteFileAdded:boolean,
    newEmoteCodeAdded:boolean,
    newEmoteCode:string,
    newEmoteFile:File,
    canAddEmote: boolean;
}

// TODO: Merge with EmoteSettings?
export default class RoomEmoteSettings extends React.Component<IProps, IState> {
    private emoteUpload = createRef<HTMLInputElement>();

    constructor(props: IProps) {
        super(props);

        const client = MatrixClientPeg.get();
        const room = client.getRoom(props.roomId);
        if (!room) throw new Error(`Expected a room for ID: ${props.roomId}`);

        let emotes = room.currentState.getStateEvents("m.room.emotes", "");
        
        //if (avatarUrl) avatarUrl = mediaFromMxc(avatarUrl).getSquareThumbnailHttp(96);

        this.state = {
            emotes: emotes,
            EmoteFieldsTouched: {},
            newEmoteFileAdded:false,
            newEmoteCodeAdded:false,
            newEmoteCode: "",
            newEmoteFile: null,
            canAddEmote: room.currentState.maySendStateEvent('m.room.emotes', client.getUserId()),
        };
    }

    private uploadAvatar = (): void => {
        this.emoteUpload.current.click();
    };


    private isSaveEnabled = () => {
        return Boolean(Object.values(this.state.EmoteFieldsTouched).length) || (this.state.newEmoteCodeAdded && this.state.newEmoteFileAdded);
    };

    private cancelEmoteChanges = async (e: React.MouseEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.isSaveEnabled()) return;
        this.setState({
            EmoteFieldsTouched: {},
            //reset the emotes
        });
    };

    private saveEmote = async (e: React.FormEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.isSaveEnabled()) return;
        this.setState({ EmoteFieldsTouched: {} });

        const client = MatrixClientPeg.get();
        const newState: Partial<IState> = {};

        // TODO: What do we do about errors?

        if (this.state.emotes) {
            const emotes = await client.uploadContent(this.state.emotes);
            await client.sendStateEvent(this.props.roomId, 'm.room.emotes', { emotes: emotes }, '');
            /*newState.avatarUrl = mediaFromMxc(uri).getSquareThumbnailHttp(96);
            newState.originalAvatarUrl = newState.avatarUrl;
            newState.avatarFile = null;*/
        } else if (this.state.originalAvatarUrl !== this.state.avatarUrl) {
            await client.sendStateEvent(this.props.roomId, 'm.room.avatar', {}, '');
        }

        this.setState(newState as IState);
    };


   private onEmoteChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        const newEmotes = { ...this.state.emotes, [name]: value };
        this.setState({ emotes: newEmotes, EmoteFieldsTouched: { ...this.state.EmoteFieldsTouched, [name]: true } });
    }

    private onEmoteFileAdd = (e: React.ChangeEvent<HTMLInputElement>): void => {
        if (!e.target.files || !e.target.files.length) {
            this.setState({
                newEmoteFileAdded: false,
                EmoteFieldsTouched: {
                    ...this.state.EmoteFieldsTouched,
                },
            });
            return;
        }

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.setState({
                newEmoteFileAdded: true,
                newEmoteFile: file,
                EmoteFieldsTouched: {
                    ...this.state.EmoteFieldsTouched,
                },
            });
        };
        reader.readAsDataURL(file);
    };
    private onEmoteCodeAdd = (e: React.ChangeEvent<HTMLInputElement>): void => {
        if(e.target.value.length > 0){
            this.setState({
                newEmoteCodeAdded: true,
                EmoteFieldsTouched: {
                    ...this.state.EmoteFieldsTouched,
                },
            });
        }
        else{
        this.setState({
            newEmoteCodeAdded: false,
        });
    }
    }

    public render(): JSX.Element {
        let emoteSettingsButtons;
        if (
            this.state.canAddEmote
        ) {
            emoteSettingsButtons = (
                <div className="mx_EmoteSettings_buttons">
                    <AccessibleButton
                        onClick={this.cancelEmoteChanges}
                        kind="link"
                        disabled={!this.isSaveEnabled()}
                    >
                        { _t("Cancel") }
                    </AccessibleButton>
                    <AccessibleButton
                        onClick={this.saveEmote}
                        kind="primary"
                        disabled={!this.isSaveEnabled()}
                    >
                        { _t("Save") }
                    </AccessibleButton>
                </div>
            );
        }

        let emoteUploadButton;
        if (this.state.canAddEmote) {
            emoteUploadButton = (
                <div className="mx_EmoteSettings_uploadButton">
                    <AccessibleButton
                        onClick={this.uploadAvatar}
                        kind="primary"
                    >
                        { _t("Upload Emote") }
                    </AccessibleButton> 
                </div>
            );
        }
        return (
            
            <form
                onSubmit={this.saveEmote}
                autoComplete="off"
                noValidate={true}
                className="mx_EmoteSettings"
            >
                <input
                    type="file"
                    ref={this.emoteUpload}
                    className="mx_EmoteSettings_emoteUpload"
                    onClick={chromeFileInputFix}
                    onChange={this.onEmoteFileAdd}
                    accept="image/*"
                />
                <li className='mx_EmoteSettings_addEmoteField'>
                <input
                            type="text"
                            autoComplete="off"
                            placeholder=':emote:'
                            className="mx_EmoteSettings_emoteField"
                            onChange={this.onEmoteCodeAdd}
                />
                {emoteUploadButton}
                </li>
                { emoteSettingsButtons }
            </form>
        );
    }
}
