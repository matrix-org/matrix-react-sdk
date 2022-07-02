/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { ChangeEvent } from "react";
import { Room } from "matrix-js-sdk/src/models/room";

import { _t, _td } from '../../../languageHandler';
import BaseDialog from "../dialogs/BaseDialog";
import { IDialogProps } from "./IDialogProps";
import TabbedView, { Tab } from "../../structures/TabbedView";
import StyledCheckbox from "../elements/StyledCheckbox";
import { useSettingValue } from "../../../hooks/useSettings";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import RoomName from "../elements/RoomName";
import { SpacePreferenceTab } from "../../../dispatcher/payloads/OpenSpacePreferencesPayload";

interface IProps extends IDialogProps {
    space: Room;
    initialTabId?: SpacePreferenceTab;
}

const SpacePreferencesAppearanceTab = ({ space }: Pick<IProps, "space">) => {
    const showPeople = useSettingValue("Spaces.showPeopleInSpace", space.roomId);

    return (
        <div className="mx_SettingsTab">
            <div className="mx_SettingsTab_heading">{ _t("Sections to show") }</div>

            <div className="mx_SettingsTab_section">
                <StyledCheckbox
                    checked={!!showPeople}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        SettingsStore.setValue(
                            "Spaces.showPeopleInSpace",
                            space.roomId,
                            SettingLevel.ROOM_ACCOUNT,
                            !showPeople,
                        );
                    }}
                >
                    { _t("People") }
                </StyledCheckbox>
                <p>
                    { _t("This groups your chats with members of this space. " +
                        "Turning this off will hide those chats from your view of %(spaceName)s.", {
                        spaceName: space.name,
                    }) }
                </p>
            </div>
        </div>
    );
};

const SpacePreferencesDialog: React.FC<IProps> = ({ space, initialTabId, onFinished }) => {
    const tabs = [
        new Tab(
            SpacePreferenceTab.Appearance,
            _td("Appearance"),
            "mx_SpacePreferencesDialog_appearanceIcon",
            <SpacePreferencesAppearanceTab space={space} />,
        ),
    ];

    return (
        <BaseDialog
            className="mx_SpacePreferencesDialog"
            hasCancel
            onFinished={onFinished}
            title={_t("Preferences")}
            fixedWidth={false}
        >
            <h4>
                <RoomName room={space} />
            </h4>
            <div className="mx_SettingsDialog_content">
                <TabbedView tabs={tabs} initialTabId={initialTabId} />
            </div>
        </BaseDialog>
    );
};

export default SpacePreferencesDialog;
