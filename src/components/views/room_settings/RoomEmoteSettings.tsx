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

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import AccessibleButton from "../elements/AccessibleButton";
import { chromeFileInputFix } from "../../../utils/BrowserWorkarounds";
import { uploadFile } from "../../../ContentMessages";
import { decryptFile } from "../../../utils/DecryptFile";
import { IEncryptedFile } from "../../../customisations/models/IMediaEventContent";

interface IProps {
    roomId: string;
}

interface IState {
    emotes: Dictionary<IEncryptedFile>;
    decryptedemotes: Dictionary<string>;
    EmoteFieldsTouched: Record<string, string>;
    newEmoteFileAdded: boolean;
    newEmoteCodeAdded: boolean;
    newEmoteCode: Array<string>;
    newEmoteFile: Array<File>;
    canAddEmote: boolean;
    deleted: boolean;
    deletedItems: Dictionary<IEncryptedFile>;
    value: Dictionary<string>;
}

// TODO: Merge with EmoteSettings?
export default class RoomEmoteSettings extends React.Component<IProps, IState> {
    private emoteUpload = createRef<HTMLInputElement>();
    private emoteCodeUpload = createRef<HTMLInputElement>();
    private emoteUploadImage = createRef<HTMLImageElement>();
    constructor(props: IProps) {
        super(props);

        const client = MatrixClientPeg.get();
        const room = client.getRoom(props.roomId);
        if (!room) throw new Error(`Expected a room for ID: ${props.roomId}`);
        //TODO: Do not encrypt/decrypt if room is not encrypted
        const emotesEvent = room.currentState.getStateEvents("m.room.emotes", "");
        const emotes = emotesEvent ? (emotesEvent.getContent() || {}) : {};
        const value = {};
        for (const emote in emotes) {
            value[emote] = emote;
        }

        this.state = {
            emotes: emotes,
            decryptedemotes: {},
            EmoteFieldsTouched: {},
            newEmoteFileAdded: false,
            newEmoteCodeAdded: false,
            newEmoteCode: [""],
            newEmoteFile: [],
            deleted: false,
            deletedItems: {},
            canAddEmote: room.currentState.maySendStateEvent('m.room.emotes', client.getUserId()),
            value: value,
        };
        this.decryptEmotes();
    }

    private uploadEmoteClick = (): void => {
        this.emoteUpload.current.click();
    };

    private isSaveEnabled = () => {
        return Boolean(Object.values(this.state.EmoteFieldsTouched).length) ||
         (this.state.newEmoteCodeAdded && this.state.newEmoteFileAdded) ||
         (this.state.deleted);
    };

    private cancelEmoteChanges = async (e: React.MouseEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();
        const value = {};
        if (this.state.deleted) {
            for (const key in this.state.deletedItems) {
                this.state.emotes[key] = this.state.deletedItems[key];
                value[key] = key;
            }
        }
        document.querySelectorAll(".mx_EmoteSettings_existingEmoteCode").forEach(field => {
            value[(field as HTMLInputElement).id] = (field as HTMLInputElement).id;
        });
        if (!this.isSaveEnabled()) return;
        this.setState({
            EmoteFieldsTouched: {},
            newEmoteFileAdded: false,
            newEmoteCodeAdded: false,
            newEmoteCode: [""],
            newEmoteFile: [],
            deleted: false,
            deletedItems: {},
            value: value,
        });

        //this.emoteUpload.current.value = "";
        //this.emoteCodeUpload.current.value = "";
    };
    private deleteEmote = (e: React.MouseEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();
        const cleanemotes = {};
        const deletedItems = this.state.deletedItems;
        const value = {};
        const id = e.currentTarget.getAttribute("id");
        for (const emote in this.state.emotes) {
            if (emote != id) {
                cleanemotes[emote] = this.state.emotes[emote];
                value[emote] = emote;
            } else {
                deletedItems[emote] = this.state.emotes[emote];
            }
        }

        this.setState({ deleted: true, emotes: cleanemotes, deletedItems: deletedItems, value: value });
        return;
    };
    private saveEmote = async (e: React.FormEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.isSaveEnabled()) return;
        const client = MatrixClientPeg.get();
        const newState: Partial<IState> = {};
        const emotesMxcs = {};
        const value = {};
        // TODO: What do we do about errors?

        if (this.state.emotes || (this.state.newEmoteFileAdded && this.state.newEmoteCodeAdded)) {
            //TODO: Encrypt the shortcode and the image data before uploading
            if (this.state.newEmoteFileAdded && this.state.newEmoteCodeAdded) {
                for (var i = 0; i < this.state.newEmoteCode.length; i++) {
                const newEmote = await uploadFile(client, this.props.roomId, this.state.newEmoteFile[i]); //await client.uploadContent(this.state.newEmoteFile); FOR UNENCRYPTED
                emotesMxcs[this.state.newEmoteCode[i]] = newEmote.file;
                value[this.state.newEmoteCode[i]] = this.state.newEmoteCode[i];
            }
            }
            if (this.state.emotes) {
                for (const shortcode in this.state.emotes) {
                    if ((this.state.newEmoteFileAdded && this.state.newEmoteCodeAdded)
                    && (shortcode in this.state.newEmoteCode)) {
                        continue;
                    }
                    if (this.state.EmoteFieldsTouched.hasOwnProperty(shortcode)) {
                        emotesMxcs[this.state.EmoteFieldsTouched[shortcode]] = this.state.emotes[shortcode];
                        value[this.state.EmoteFieldsTouched[shortcode]] = this.state.EmoteFieldsTouched[shortcode];
                    } else {
                        emotesMxcs[shortcode] = this.state.emotes[shortcode];
                        value[shortcode] = shortcode;
                    }
                }
            }
            newState.value = value;
            await client.sendStateEvent(this.props.roomId, 'm.room.emotes', emotesMxcs, "");
            //this.emoteUpload.current.value = "";
            //this.emoteCodeUpload.current.value = "";
            newState.newEmoteFileAdded = false;
            newState.newEmoteCodeAdded = false;
            newState.EmoteFieldsTouched = {};
            newState.emotes = emotesMxcs;
            newState.deleted = false;
            newState.deletedItems = {};
            newState.newEmoteCode = [""]
            newState.newEmoteFile =[]
        }
        this.setState(newState as IState);
        this.decryptEmotes();
    };

    private onEmoteChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const id = e.target.getAttribute("id");
        const b = this.state.value;
        b[id] = e.target.value;
        this.setState({ value: b, EmoteFieldsTouched: { ...this.state.EmoteFieldsTouched, [id]: e.target.value } });
    };

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

        const uploadedFiles=[]
        const newCodes=[]
        for (const file of e.target.files){
            const fileName = file.name.replace(/\.[^.]*$/,'')
            uploadedFiles.push(file)
            newCodes.push(fileName)
        }  
        //reader.onload = (ev) => {
            this.setState({
                newEmoteCodeAdded: true,
                newEmoteFileAdded: true,
                newEmoteCode: newCodes,
                newEmoteFile: uploadedFiles,
                EmoteFieldsTouched: {
                    ...this.state.EmoteFieldsTouched,
                },
            });
            //this.emoteUploadImage.current.src = URL.createObjectURL(file);
        //};
        //reader.readAsDataURL(file);
    };
    private onEmoteCodeAdd = (e: React.ChangeEvent<HTMLInputElement>): void => {
        if (e.target.value.length > 0) {
            const updatedCode=this.state.newEmoteCode;
            updatedCode[e.target.getAttribute("data-index")]=e.target.value;
            this.setState({
                newEmoteCodeAdded: true,
                newEmoteCode: updatedCode,
                EmoteFieldsTouched: {
                    ...this.state.EmoteFieldsTouched,
                },
            });
        } else {
            const updatedCode=this.state.newEmoteCode;
            updatedCode[e.target.getAttribute("data-index")]=e.target.value;
            this.setState({
                newEmoteCodeAdded: false,
                newEmoteCode: updatedCode,
            });
        }
    };
    private async decryptEmotes() {
        const decryptede={};
        for (const shortcode in this.state.emotes) {
            const blob = await decryptFile(this.state.emotes[shortcode]);
            decryptede[shortcode] = URL.createObjectURL(blob);
        }
        this.setState({
            decryptedemotes: decryptede,
        });
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

        const existingEmotes = [];
        if (this.state.emotes) {
            for (const emotecode in this.state.emotes) {
                existingEmotes.push(
                    <li className='mx_EmoteSettings_addEmoteField'>
                        <input
                            type="text"
                            id={emotecode}
                            value={this.state.value[emotecode]}
                            onChange={this.onEmoteChange}
                            className="mx_EmoteSettings_existingEmoteCode"

                        />
                        <img className="mx_EmoteSettings_uploadedEmoteImage"
                            src={
                                this.state.decryptedemotes[emotecode]
                            } />
                        <div className="mx_EmoteSettings_uploadButton">
                            <AccessibleButton
                                onClick={this.deleteEmote}
                                className=""
                                kind="danger_outline"
                                aria-label="Close"
                                id={emotecode}
                            >
                                { _t("Delete") }
                            </AccessibleButton>
                        </div>
                    </li>,
                );
            }
        }

        let emoteUploadButton;
        if (this.state.canAddEmote) {
            emoteUploadButton = (
                <div className="mx_EmoteSettings_uploadButton">
                    <AccessibleButton
                        onClick={this.uploadEmoteClick}
                        kind="primary"
                    >
                        { _t("Upload Emote") }
                    </AccessibleButton>
                </div>
            );
        }

        let uploadedEmotes =[];
        for (var i = 0; i < this.state.newEmoteCode.length; i++) {
            const fileUrl=this.state.newEmoteFile[i]? URL.createObjectURL(this.state.newEmoteFile[i]):""
            uploadedEmotes.push(
                <li className='mx_EmoteSettings_addEmoteField'>
                <input
                    ref={this.emoteCodeUpload}
                    type="text"
                    autoComplete="off"
                    placeholder=':emote:'
                    value={this.state.newEmoteCode[i]}
                    data-index={i}
                    className="mx_EmoteSettings_emoteField"
                    onChange={this.onEmoteCodeAdd}
                />
                {
                    this.state.newEmoteFileAdded ?
                        <img
                            src={fileUrl}
                            ref={this.emoteUploadImage}
                            className="mx_EmoteSettings_uploadedEmoteImage"
                        /> : null
                }

                { i==0? emoteUploadButton: null }
            </li>

            )
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
                    multiple
                />
                { emoteSettingsButtons }
                { uploadedEmotes }
                {
                    existingEmotes
                }
            </form>
        );
    }
}
