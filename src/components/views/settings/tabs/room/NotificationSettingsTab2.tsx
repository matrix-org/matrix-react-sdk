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

import React from "react";

import {_t} from "../../../../../languageHandler";
import AccessibleButton from "../../../elements/AccessibleButton";
import StyledCheckbox from "../../../elements/StyledCheckbox";
import SettingsSection from "../../SettingsSection";

interface IProps {
    roomId: string;
}

const NotificationSettingsTab2: React.FC<IProps> = ({roomId}) => {
    const currentSound = "default";
    const uploadedFile = "";
    const _clearSound = () => {};
    const _onSoundUploadChanged = () => {};
    const _triggerUploader = () => {};
    const _onClickSaveSound = () => {};
    let currentUploadedFile;
    let _soundUpload;
    const onChange = () => {};
    let notifyMeOn;

    return <div className="mx_SettingsTab mx_RoomNotificationSettings">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        <div className="mx_SettingsTab_subsectionText">
            Manage notifications in this room...
        </div>

        <SettingsSection title={_t("Notify me on")}>
            <label>
                <input
                    type="radio"
                    name="notifyMeOn"
                    value="all_messages"
                    onChange={onChange}
                    checked={notifyMeOn === "all_messages"} />
                {_t("All messages")}
            </label>
            <label>
                <input
                    type="radio"
                    name="notifyMeOn"
                    value="mentions_keywords"
                    onChange={onChange}
                    checked={notifyMeOn === "mentions_keywords"} />
                {_t("Mentions & keywords only")}
            </label>
            <label>
                <input
                    type="radio"
                    name="notifyMeOn"
                    value="never"
                    onChange={onChange}
                    checked={notifyMeOn === "never"} />
                {_t("Never")}
            </label>
        </SettingsSection>

        <SettingsSection title={"Room alerts"}>
            <StyledCheckbox>
                {_t("Room alerts")}
                <div>{_t("Notify you when using @room")}</div>
            </StyledCheckbox>
        </SettingsSection>

        <SettingsSection title={"Sound alerts"}>
            <StyledCheckbox>
                {_t("Play a sound when receiving a notification")}
            </StyledCheckbox>

            <label>
                <input
                    type="radio"
                    name="sound"
                    value="sound1"
                    onChange={onChange}
                    checked={currentSound === "sound1"} />
                {_t("Bird Sound")}
            </label>
            <label>
                <input
                    type="radio"
                    name="sound"
                    value="sound2"
                    onChange={onChange}
                    checked={currentSound === "sound2"} />
                {_t("Knock on wood")}
            </label>
            <label>
                <input
                    type="radio"
                    name="sound"
                    value="sound0"
                    onChange={onChange}
                    checked={currentSound === "sound0"} />
                {_t("Use default")}
            </label>
        </SettingsSection>

        <hr />

        <div className='mx_SettingsTab_section mx_SettingsTab_subsectionText'>
            <span className='mx_SettingsTab_subheading'>{_t("Sounds")}</span>
            <div>
                <span>{_t("Notification sound")}: <code>{currentSound}</code></span><br />
                <AccessibleButton className="mx_NotificationSound_resetSound" disabled={currentSound === "default"} onClick={_clearSound} kind="primary">
                    {_t("Reset")}
                </AccessibleButton>
            </div>
            <div>
                <h3>{_t("Set a new custom sound")}</h3>
                <form autoComplete="off" noValidate={true}>
                    <input ref={_soundUpload} className="mx_NotificationSound_soundUpload" type="file" onChange={_onSoundUploadChanged} accept="audio/*" />
                </form>

                {currentUploadedFile}

                <AccessibleButton className="mx_NotificationSound_browse" onClick={_triggerUploader} kind="primary">
                    {_t("Browse")}
                </AccessibleButton>

                <AccessibleButton className="mx_NotificationSound_save" disabled={uploadedFile === null} onClick={_onClickSaveSound} kind="primary">
                    {_t("Save")}
                </AccessibleButton>
                <br />
            </div>
        </div>
    </div>;
};

export default NotificationSettingsTab2;
