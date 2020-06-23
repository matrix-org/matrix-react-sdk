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

import SettingsSection from "../SettingsSection";
import {_t} from "../../../../languageHandler";
import {IPushRule, IPushRulesMap} from "../../../../notifications/types";
import AccessibleButton from "../../elements/AccessibleButton";
import QuestionDialog from "../../dialogs/QuestionDialog";

interface IProps {
    pushRules: IPushRulesMap;
}

interface IRoomOverrideTileProps {
    rule: IPushRule;
}

interface IResetAllRoomsDialogProps {
    onFinished(): void;
}

const RoomOverrideTile: React.FC<IRoomOverrideTileProps> = ({rule}) => {
    return <div>
        Avatar...Name...Context menu
    </div>;
};

const ResetAllRoomsDialog: React.FC<IResetAllRoomsDialogProps> = ({onFinished}) => {
    return <QuestionDialog onFinished={onFinished}
                           title={_t("Resetting all rooms")}
                           description={_t("Are you sure you want to reset all rooms?")}
                           button={_t("Yes")}
                           cancelButton={_t("No")}
    />;
};

const RoomOverridesSection: React.FC<IProps> = ({pushRules}) => {
    const onResetAllRoomsClick = () => {};

    return <SettingsSection title={_t("Room notifications")}>
        <div className="mx_SettingsTab_subsectionText">
            {_t("Rooms listed below use custom notification settings")}
        </div>

        <div>
            <RoomOverrideTile rule={null} />
            <RoomOverrideTile rule={null} />
            <RoomOverrideTile rule={null} />
        </div>

        <AccessibleButton kind="link" onClick={onResetAllRoomsClick}>
            {_t("Reset all rooms")}
        </AccessibleButton>
    </SettingsSection>;
};

export default RoomOverridesSection;
