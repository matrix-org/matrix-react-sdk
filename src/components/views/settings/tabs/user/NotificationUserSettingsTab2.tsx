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
import {_t} from "../../../../../languageHandler";
import StyledCheckbox from "../../../elements/StyledCheckbox";
import SettingsSection from "../../SettingsSection";

const NotificationUserSettingsTab2: React.FC<{}> = () => {
    const currentSound = "default";
    const onChange = () => {};
    let notifyMeWith;

    return <div className="mx_SettingsTab mx_NotificationsTab">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        <div className="mx_SettingsTab_subsectionText">
            {_t("Manage notifications across all rooms...")}
        </div>

        <SettingsSection title={_t("Notify me with")}>
            <label>
                <input
                    type="radio"
                    name="notifyMeWith"
                    value="all_messages"
                    onChange={onChange}
                    checked={notifyMeWith === "all_messages"} />
                {_t("All messages")}
            </label>
            <label>
                <input
                    type="radio"
                    name="notifyMeWith"
                    value="dm_mentions_keywords"
                    onChange={onChange}
                    checked={notifyMeWith === "dm_mentions_keywords"} />
                {_t("Direct messages, mentions & keywords")}
            </label>
            <label>
                <input
                    type="radio"
                    name="notifyMeWith"
                    value="mentions_keywords"
                    onChange={onChange}
                    checked={notifyMeWith === "mentions_keywords"} />
                {_t("Mentions & keywords only")}
            </label>
            <label>
                <input
                    type="radio"
                    name="notifyMeWith"
                    value="never"
                    onChange={onChange}
                    checked={notifyMeWith === "never"} />
                {_t("Never")}
            </label>
        </SettingsSection>

        <SettingsSection title={"Mentions & Keywords"}>
            <StyledCheckbox>
                {_t("Notify when someone mentions using @")}
            </StyledCheckbox>
            <StyledCheckbox>
                {_t("Notify when someone uses a keyword")}
                <div>{_t("Enter keywords here, or use for spelling variations or nicknames")}</div>
            </StyledCheckbox>
        </SettingsSection>

        <SettingsSection title={"Appearance & Sounds"}>
            <StyledCheckbox>
                {_t("Show a badge when I'm mentioned")}
            </StyledCheckbox>
            <StyledCheckbox>
                {_t("Show counts in badges")}
            </StyledCheckbox>

            <div>
                PREVIEW Avatar
            </div>

            <br />
            <br />

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

        <SettingsSection title={_t("Desktop notifications")}>
            <StyledCheckbox>
                {_t("Receive OS provided notifications from your desktop application")}
            </StyledCheckbox>
        </SettingsSection>

        <SettingsSection title={_t("Email notifications")}>
            <StyledCheckbox>
                {_t("Receive a summary of missed notifications by email")}
            </StyledCheckbox>
            Email input????
        </SettingsSection>

        <SettingsSection title={_t("Advanced notifications")}>
            Show more button
        </SettingsSection>
    </div>;
};

export default NotificationUserSettingsTab2;
