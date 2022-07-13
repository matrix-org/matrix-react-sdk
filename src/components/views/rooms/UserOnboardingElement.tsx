/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import classNames from "classnames";
import React, { useCallback } from "react";

import { Action } from "../../../dispatcher/actions";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { useSettingValue } from "../../../hooks/useSettings";
import { _t } from "../../../languageHandler";
import { SettingLevel } from "../../../settings/SettingLevel";
import SettingsStore from "../../../settings/SettingsStore";
import AccessibleButton from "../elements/AccessibleButton";
import ProgressBar from "../elements/ProgressBar";
import Heading from "../typography/Heading";

function toPercentage(progress: number): string {
    return (progress * 100).toFixed(0);
}

interface Props {
    selected: boolean;
    minimized: boolean;
}

export function UserOnboardingElement({ selected, minimized }: Props) {
    const [completedTasks, tasks] = [0, 0];
    const progress = tasks ? completedTasks / tasks : 1;
    const completed = !tasks || tasks === completedTasks;

    const onDismiss = useCallback(() => {
        SettingsStore.setValue("FTUE.userOnboardingButton", null, SettingLevel.ACCOUNT, false);
    }, []);

    const visible = useSettingValue("FTUE.userOnboardingButton");
    if (!visible || minimized) {
        return null;
    }

    return (
        <AccessibleButton
            className={classNames("mx_UserOnboardingElement", {
                "mx_UserOnboardingElement_selected": selected,
                "mx_UserOnboardingElement_minimized": minimized,
            })}
            onClick={() => defaultDispatcher.fire(Action.ViewHomePage)}>
            { !minimized && (
                <>
                    <div className="mx_UserOnboardingElement_content">
                        <Heading size="h4" className="mx_Heading_h4">
                            { _t("Welcome") }
                        </Heading>
                        { !completed && (
                            <div className="mx_UserOnboardingElement_percentage">
                                { toPercentage(progress) }%
                            </div>
                        ) }
                        <AccessibleButton
                            className="mx_UserOnboardingElement_close"
                            onClick={onDismiss}
                        />
                    </div>
                    { !completed && (
                        <ProgressBar value={completedTasks} max={tasks} />
                    ) }
                </>
            ) }
        </AccessibleButton>
    );
}
